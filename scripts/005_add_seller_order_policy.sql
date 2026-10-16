-- Add RLS policy to allow sellers to view order items for their products
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = order_items.product_id 
    AND products.seller_id = auth.uid()
  )
);
