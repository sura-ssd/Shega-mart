-- Add policy to allow sellers to view orders containing their products
CREATE POLICY "Sellers can view orders for their products" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
);

-- Add policy to allow sellers to view order_items for their products
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND p.seller_id = auth.uid()
  )
);
