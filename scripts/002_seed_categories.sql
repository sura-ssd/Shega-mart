-- Insert default categories
INSERT INTO public.categories (name, slug, description, image_url) VALUES
  ('Clothing', 'clothing', 'Fashion and apparel for all styles', '/placeholder.svg?height=400&width=600'),
  ('Electronics', 'electronics', 'Latest tech gadgets and devices', '/placeholder.svg?height=400&width=600'),
  ('Shoes', 'shoes', 'Footwear for every occasion', '/placeholder.svg?height=400&width=600'),
  ('Home & Living', 'home-living', 'Modern home essentials and decor', '/placeholder.svg?height=400&width=600'),
  ('Accessories', 'accessories', 'Complete your look with premium accessories', '/placeholder.svg?height=400&width=600')
ON CONFLICT (slug) DO NOTHING;
