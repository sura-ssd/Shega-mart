-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;

-- Add simple seller policy for order_items that checks products table directly
-- This avoids circular references by not referencing the orders table
CREATE POLICY "Sellers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND seller_id = auth.uid())
);
