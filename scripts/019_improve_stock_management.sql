-- Improve stock management system
-- This migration adds better stock validation and reservation

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_order(uuid, numeric, text, text, text, text, text, jsonb);

-- Create improved order creation function with stock validation and reservation
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
  v_product_stock integer;
BEGIN
  -- First, validate stock availability for all items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    SELECT stock INTO v_product_stock
    FROM products
    WHERE id = (v_item->>'product_id')::uuid;
    
    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;
    
    IF v_product_stock < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        v_item->>'product_id', v_product_stock, v_item->>'quantity';
    END IF;
  END LOOP;

  -- Create the order
  INSERT INTO orders (
    customer_id,
    total_amount,
    status,
    shipping_address,
    customer_name,
    customer_email,
    customer_phone,
    payment_method
  ) VALUES (
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

  -- Insert order items and immediately reserve stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      price,
      variant_size,
      variant_color,
      variant_model,
      variant_image_url,
      seller_status
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'price')::numeric,
      v_item->>'variant_size',
      v_item->>'variant_color',
      v_item->>'variant_model',
      v_item->>'variant_image_url',
      'pending'
    );
    
    -- Immediately decrement stock when order is placed (reserve inventory)
    UPDATE products
    SET stock = stock - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Update the seller status update function to NOT decrement stock
-- (since it's already decremented when order is placed)
DROP FUNCTION IF EXISTS update_seller_status(uuid, text);

CREATE OR REPLACE FUNCTION update_seller_status(
  p_item_id uuid,
  p_new_status text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id uuid;
  v_product_id uuid;
  v_authenticated_user_id uuid;
BEGIN
  -- Get authenticated user
  v_authenticated_user_id := auth.uid();
  
  IF v_authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the product_id and verify seller ownership
  SELECT oi.product_id, p.seller_id INTO v_product_id, v_seller_id
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.id = p_item_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  IF v_seller_id != v_authenticated_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this order item';
  END IF;

  -- Update the seller status (stock was already decremented at order placement)
  UPDATE order_items
  SET seller_status = p_new_status
  WHERE id = p_item_id;

  RETURN 'Status updated successfully';
END;
$$;

-- Add comment explaining the stock management flow
COMMENT ON FUNCTION create_order IS 'Creates order and immediately reserves stock by decrementing inventory';
COMMENT ON FUNCTION update_seller_status IS 'Updates seller fulfillment status without affecting stock (stock already reserved at order placement)';
