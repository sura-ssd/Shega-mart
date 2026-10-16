-- Drop the function first to allow return type changes
DROP FUNCTION IF EXISTS public.get_seller_orders(UUID);

-- Update the get_seller_orders function to include seller_status and updated_at
CREATE OR REPLACE FUNCTION public.get_seller_orders(p_seller_id UUID)
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
  JOIN public.order_items oi ON o.id = oi.order_id
  JOIN public.products p ON oi.product_id = p.id
  WHERE p.seller_id = p_seller_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
