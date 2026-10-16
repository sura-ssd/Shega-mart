-- Update categories with real image URLs for luxury e-commerce
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1595777707802-41d339d60280?w=800&q=80' WHERE slug = 'clothing';
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' WHERE slug = 'electronics';
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' WHERE slug = 'shoes';
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80' WHERE slug = 'home-living';
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80' WHERE slug = 'accessories';
