-- Drop existing policies before recreating them to avoid conflicts
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;

-- Add policy to allow sellers to view orders for their products
CREATE POLICY "Sellers can view orders for their products" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  ) OR
  auth.uid() = customer_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add policy to allow sellers to view order items for their products
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND p.seller_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
