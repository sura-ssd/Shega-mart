-- Older product forms stored a zero for every option even when sellers had not configured per-variant stock.
-- Empty those maps so create_order falls back to the product's aggregate stock.
UPDATE public.products AS product
SET variant_stock = '{}'::jsonb
WHERE jsonb_typeof(COALESCE(product.variant_stock, '{}'::jsonb)) = 'object'
  AND product.variant_stock <> '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_each_text(product.variant_stock) AS variant(key, quantity)
    WHERE CASE
      WHEN variant.quantity ~ '^[0-9]+$' THEN variant.quantity::INTEGER
      ELSE 0
    END > 0
  );
