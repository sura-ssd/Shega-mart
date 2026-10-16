-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;

-- Recreate order_items policy without circular reference
-- This allows sellers to see order_items for their products
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND p.seller_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Recreate orders policy without joining to order_items
-- This allows sellers to see orders through the order_items relationship
CREATE POLICY "Sellers can view orders for their products" ON public.orders FOR SELECT USING (
  auth.uid() = customer_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
  -- Allow sellers to view orders that contain their products
  EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = orders.id AND
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = oi.product_id AND p.seller_id = auth.uid()
    )
  )
);
