-- Legacy seller forms saved zero for every variant even when no per-variant stock was entered.
-- Treat those maps as unconfigured so product stock remains available as the fallback.
UPDATE public.products AS product
SET variant_stock = '{}'::jsonb
WHERE product.stock > 0
  AND jsonb_typeof(product.variant_stock) = 'object'
  AND product.variant_stock <> '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_each_text(product.variant_stock) AS variant(key, quantity)
    WHERE CASE
      WHEN variant.quantity ~ '^[0-9]+$' THEN variant.quantity::integer
      ELSE 0
    END > 0
  );
