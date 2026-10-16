-- Add policy to allow sellers to view orders for their products
-- This policy checks if the order contains any products sold by the seller
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop the existing policy if it exists and recreate with seller support
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

CREATE POLICY "Users can view own orders or orders for their products" ON public.orders FOR SELECT USING (
  auth.uid() = customer_id 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
);
