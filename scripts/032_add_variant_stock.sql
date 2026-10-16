ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_stock JSONB NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS public.create_order(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
CREATE FUNCTION public.create_order(
  p_customer_id UUID,
  p_total_amount NUMERIC,
  p_shipping_address TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_payment_method TEXT,
  p_order_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_product_stock INTEGER;
  v_variant_stock JSONB;
  v_variant_key TEXT;
  v_primary_key TEXT;
  v_available_variant_stock INTEGER;
  v_size TEXT;
  v_color TEXT;
  v_model TEXT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_size := NULLIF(v_item->>'variant_size', '');
    v_color := NULLIF(v_item->>'variant_color', '');
    v_model := NULLIF(v_item->>'variant_model', '');

    SELECT stock, COALESCE(variant_stock, '{}'::jsonb)
      INTO v_product_stock, v_variant_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;
    IF v_quantity <= 0 OR v_product_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, requested: %', v_product_id, v_product_stock, v_quantity;
    END IF;

    IF v_model IS NOT NULL THEN
      v_primary_key := 'model:' || v_model;
    ELSIF v_size IS NOT NULL THEN
      v_primary_key := 'size:' || v_size;
    ELSE
      v_primary_key := NULL;
    END IF;

    IF v_primary_key IS NOT NULL AND v_color IS NOT NULL THEN
      v_variant_key := v_primary_key || '|color:' || v_color;
    ELSE
      v_variant_key := COALESCE(v_primary_key, CASE WHEN v_color IS NOT NULL THEN 'color:' || v_color END);
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_each_text(v_variant_stock) AS variant(key, quantity)
      WHERE CASE
        WHEN variant.quantity ~ '^[0-9]+$' THEN variant.quantity::INTEGER
        ELSE 0
      END > 0
    ) THEN
      IF v_variant_key IS NULL OR NOT (v_variant_stock ? v_variant_key) THEN
        RAISE EXCEPTION 'Selected variant is not in stock for product %', v_product_id;
      END IF;

      v_available_variant_stock := COALESCE((v_variant_stock->>v_variant_key)::INTEGER, 0);
      IF v_available_variant_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant % of product %. Available: %, requested: %', v_variant_key, v_product_id, v_available_variant_stock, v_quantity;
      END IF;

      v_variant_stock := jsonb_set(
        v_variant_stock,
        ARRAY[v_variant_key],
        to_jsonb(v_available_variant_stock - v_quantity),
        false
      );
      UPDATE public.products
      SET stock = stock - v_quantity,
          variant_stock = v_variant_stock
      WHERE id = v_product_id;
    ELSE
      UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product_id;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    customer_id, total_amount, status, shipping_address, customer_name,
    customer_email, customer_phone, payment_method
  ) VALUES (
    p_customer_id, p_total_amount, 'pending', p_shipping_address, p_customer_name,
    p_customer_email, p_customer_phone, p_payment_method
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, quantity, price, variant_size, variant_color,
      variant_model, variant_image_url, seller_status
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      NULLIF(v_item->>'variant_size', ''),
      NULLIF(v_item->>'variant_color', ''),
      NULLIF(v_item->>'variant_model', ''),
      NULLIF(v_item->>'variant_image_url', ''),
      'pending'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
