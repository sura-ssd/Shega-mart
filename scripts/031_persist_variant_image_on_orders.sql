ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_images JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS variant_size TEXT,
  ADD COLUMN IF NOT EXISTS variant_color TEXT,
  ADD COLUMN IF NOT EXISTS variant_model TEXT,
  ADD COLUMN IF NOT EXISTS variant_image_url TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_size TEXT,
  ADD COLUMN IF NOT EXISTS variant_color TEXT,
  ADD COLUMN IF NOT EXISTS variant_model TEXT,
  ADD COLUMN IF NOT EXISTS variant_image_url TEXT;

DROP FUNCTION IF EXISTS public.get_seller_orders(UUID);
CREATE FUNCTION public.get_seller_orders(p_seller_id UUID)
RETURNS TABLE (
  order_id UUID,
  customer_id UUID,
  total_amount DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  payment_method TEXT,
  item_id UUID,
  quantity INTEGER,
  price DECIMAL,
  seller_status TEXT,
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  variant_size TEXT,
  variant_color TEXT,
  variant_model TEXT,
  variant_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.customer_id,
    o.total_amount,
    o.status,
    o.created_at,
    o.updated_at,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.shipping_address,
    o.payment_method,
    oi.id,
    oi.quantity,
    oi.price,
    COALESCE(oi.seller_status, 'pending'),
    p.id,
    p.name,
    p.image_url,
    oi.variant_size,
    oi.variant_color,
    oi.variant_model,
    oi.variant_image_url
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = p_seller_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_customer_pending_orders(p_customer_id UUID)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount NUMERIC,
  status TEXT,
  shipping_address TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_items JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.customer_id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.total_amount,
    o.status,
    o.shipping_address,
    o.payment_method,
    o.created_at,
    o.updated_at,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'price', oi.price,
        'product_name', p.name,
        'product_image_url', p.image_url,
        'variant_size', oi.variant_size,
        'variant_color', oi.variant_color,
        'variant_model', oi.variant_model,
        'variant_image_url', oi.variant_image_url,
        'seller_status', COALESCE(oi.seller_status, 'pending')
      ))
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
        AND COALESCE(oi.seller_status, 'pending') != 'completed'
    )
  FROM public.orders o
  WHERE o.customer_id = p_customer_id
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = o.id
        AND COALESCE(oi.seller_status, 'pending') != 'completed'
    )
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_pending_orders(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_customer_purchase_history(UUID);
CREATE FUNCTION public.get_customer_purchase_history(p_customer_id UUID)
RETURNS TABLE (
  order_id UUID,
  order_created_at TIMESTAMPTZ,
  order_total NUMERIC,
  order_status TEXT,
  payment_method TEXT,
  shipping_address TEXT,
  item_id UUID,
  item_quantity INTEGER,
  item_price NUMERIC,
  item_seller_status TEXT,
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  variant_size TEXT,
  variant_color TEXT,
  variant_model TEXT,
  variant_image_url TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.created_at,
    o.total_amount,
    o.status,
    o.payment_method,
    o.shipping_address,
    oi.id,
    oi.quantity,
    oi.price,
    COALESCE(oi.seller_status, 'pending'),
    p.id,
    p.name,
    p.image_url,
    oi.variant_size,
    oi.variant_color,
    oi.variant_model,
    oi.variant_image_url
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.products p ON p.id = oi.product_id
  WHERE o.customer_id = p_customer_id
    AND oi.seller_status = 'completed'
  ORDER BY o.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_purchase_history(UUID) TO authenticated;

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
  v_product_stock INTEGER;
  v_product_id UUID;
  v_quantity INTEGER;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT stock INTO v_product_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;
    IF v_quantity <= 0 OR v_product_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, requested: %', v_product_id, v_product_stock, v_quantity;
    END IF;

    UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product_id;
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
      v_item->>'variant_size',
      v_item->>'variant_color',
      v_item->>'variant_model',
      v_item->>'variant_image_url',
      'pending'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
