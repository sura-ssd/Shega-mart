-- Add payment_method column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create function to safely decrement stock
CREATE OR REPLACE FUNCTION public.decrement_stock(product_id UUID, quantity INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock FROM public.products WHERE id = product_id;
  
  IF current_stock IS NULL THEN
    RETURN 0;
  END IF;
  
  UPDATE public.products 
  SET stock = GREATEST(0, stock - quantity)
  WHERE id = product_id;
  
  RETURN GREATEST(0, current_stock - quantity);
END;
$$ LANGUAGE plpgsql;
