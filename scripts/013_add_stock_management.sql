-- Check if decrement_stock function exists and recreate it
DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE (
  product_id UUID,
  new_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id
  RETURNING p_product_id, stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add payment_method column to orders if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Add seller selling status to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'pending';

-- Add variant columns to order_items if they do not exist
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_size TEXT;
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_color TEXT;
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_model TEXT;
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_image_url TEXT;

-- Create policy to allow sellers to update seller_status
CREATE POLICY "Sellers can update their order item status" ON public.order_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = order_items.product_id
    AND products.seller_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = order_items.product_id
    AND products.seller_id = auth.uid()
  )
);
