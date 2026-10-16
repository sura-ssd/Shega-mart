-- Create a secure function to create orders that bypasses RLS
CREATE OR REPLACE FUNCTION create_order(
  p_customer_id uuid,
  p_total_amount numeric,
  p_shipping_address text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method text,
  p_order_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Insert the order
  INSERT INTO orders (
    customer_id,
    total_amount,
    status,
    shipping_address,
    customer_name,
    customer_email,
    customer_phone,
    payment_method
  )
  VALUES (
    p_customer_id,
    p_total_amount,
    'pending',
    p_shipping_address,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_payment_method
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, price, variant_size, variant_color, variant_model, variant_image_url)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'price')::numeric,
      (v_item->>'variant_size'),
      (v_item->>'variant_color'),
      (v_item->>'variant_model'),
      (v_item->>'variant_image_url')
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_order TO authenticated;
