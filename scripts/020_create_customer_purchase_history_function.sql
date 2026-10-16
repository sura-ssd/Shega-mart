-- Create function to get customer's completed purchases
DROP FUNCTION IF EXISTS get_customer_purchase_history(uuid);

CREATE OR REPLACE FUNCTION get_customer_purchase_history(p_customer_id uuid)
RETURNS TABLE (
  order_id uuid,
  order_created_at timestamp with time zone,
  order_total numeric,
  order_status text,
  payment_method text,
  shipping_address text,
  item_id uuid,
  item_quantity integer,
  item_price numeric,
  item_seller_status text,
  product_id uuid,
  product_name text,
  product_image_url text,
  variant_size text,
  variant_color text,
  variant_model text,
  variant_image_url text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.created_at as order_created_at,
    o.total_amount as order_total,
    o.status as order_status,
    o.payment_method,
    o.shipping_address,
    oi.id as item_id,
    oi.quantity as item_quantity,
    oi.price as item_price,
    COALESCE(oi.seller_status, 'pending') as item_seller_status,
    p.id as product_id,
    p.name as product_name,
    p.image_url as product_image_url,
    oi.variant_size,
    oi.variant_color,
    oi.variant_model,
    oi.variant_image_url
  FROM orders o
  INNER JOIN order_items oi ON oi.order_id = o.id
  INNER JOIN products p ON p.id = oi.product_id
  WHERE o.customer_id = p_customer_id
    AND oi.seller_status = 'completed'
  ORDER BY o.created_at DESC;
END;
$$;
