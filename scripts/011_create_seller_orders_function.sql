-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;

-- Create a secure function for sellers to fetch their orders
CREATE OR REPLACE FUNCTION public.get_seller_orders(p_seller_id UUID)
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
  -- Fixed ambiguous seller_id reference by using p_seller_id parameter
  WHERE p.seller_id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add simple seller policy to order_items (just check if seller owns the product)
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND seller_id = auth.uid())
);

-- Add simple seller policy to orders (allow sellers to view orders containing their products)
CREATE POLICY "Sellers can view orders for their products" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
);
