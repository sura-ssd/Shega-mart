-- Add variant columns to cart_items table for per-variant persistence
ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS variant_size TEXT;

ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS variant_color TEXT;

ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS variant_model TEXT;

-- Ensure unique constraint includes variant columns so different variants are separate rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'cart_items_user_product_variant_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_unique;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;

    BEGIN
      ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_product_variant_unique UNIQUE (user_id, product_id, variant_size, variant_color, variant_model);
    EXCEPTION WHEN OTHERS THEN
      -- ignore if creation fails
    END;
  END IF;
END$$;
