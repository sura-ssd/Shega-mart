-- Create a function to fetch customer's pending orders (not completed)
-- This returns only orders with items that are still pending or in progress

DROP FUNCTION IF EXISTS get_customer_pending_orders(uuid);

CREATE OR REPLACE FUNCTION get_customer_pending_orders(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  total_amount numeric,
  status text,
  shipping_address text,
  payment_method text,
  created_at timestamptz,
  updated_at timestamptz,
  order_items jsonb
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
      SELECT jsonb_agg(
        jsonb_build_object(
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
        )
      )
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
      AND COALESCE(oi.seller_status, 'pending') != 'completed'
    ) as order_items
  FROM orders o
  WHERE o.customer_id = p_customer_id
  -- Only include orders that have at least one non-completed item
  AND EXISTS (
    SELECT 1 
    FROM order_items oi2 
    WHERE oi2.order_id = o.id 
    AND COALESCE(oi2.seller_status, 'pending') != 'completed'
  )
  ORDER BY o.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_customer_pending_orders(uuid) TO authenticated;
