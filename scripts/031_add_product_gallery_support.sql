-- Add multi-image support for products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Backfill image_urls from the legacy image_url column
UPDATE public.products
SET image_urls = CASE
  WHEN image_url IS NOT NULL AND image_url <> '' THEN ARRAY[image_url]
  ELSE '{}'
END
WHERE image_urls = '{}' OR image_urls IS NULL;

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for product images
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Authenticated users can upload product images
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
CREATE POLICY "Authenticated can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Users can update their own uploaded product images
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'product-images' AND owner = auth.uid());

-- Users can delete their own uploaded product images
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
CREATE POLICY "Users can delete own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());
