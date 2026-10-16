-- Drop the existing function to recreate it with corrected parameter
DROP FUNCTION IF EXISTS public.get_seller_orders(UUID);

-- Recreate the function with corrected parameter name
CREATE FUNCTION public.get_seller_orders(p_seller_id UUID)
RETURNS TABLE (
  order_id UUID,
  customer_id UUID,
  total_amount DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  item_id UUID,
  quantity INTEGER,
  price DECIMAL,
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.customer_id,
    o.total_amount,
    o.status,
    o.created_at,
    o.customer_name,
    o.customer_email,
    oi.id,
    oi.quantity,
    oi.price,
    p.id,
    p.name,
    p.image_url
  FROM public.orders o
  JOIN public.order_items oi ON o.id = oi.order_id
  JOIN public.products p ON oi.product_id = p.id
  WHERE p.seller_id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
