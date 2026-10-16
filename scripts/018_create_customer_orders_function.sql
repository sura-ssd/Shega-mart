-- Create a function to fetch customer orders safely without RLS recursion
-- This bypasses RLS policies to avoid infinite recursion

DROP FUNCTION IF EXISTS get_customer_orders(uuid);

CREATE OR REPLACE FUNCTION get_customer_orders(p_customer_id uuid)
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
          'seller_status', COALESCE(oi.seller_status, 'pending')
        )
      )
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
    ) as order_items
  FROM orders o
  WHERE o.customer_id = p_customer_id
  ORDER BY o.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_customer_orders(uuid) TO authenticated;
