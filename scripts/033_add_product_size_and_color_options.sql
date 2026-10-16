ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS color_options TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_products_size_options
  ON public.products USING GIN (size_options);

CREATE INDEX IF NOT EXISTS idx_products_color_options
  ON public.products USING GIN (color_options);
