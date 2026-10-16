-- Phase 2: Operations features
-- Adds seller analytics support fields, admin moderation queue fields,
-- inventory alert thresholds, and return-rule automation metadata.

-- Product moderation and inventory alert fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Guard rails for new product fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_moderation_status_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_low_stock_threshold_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_low_stock_threshold_check
      CHECK (low_stock_threshold >= 0);
  END IF;
END $$;

-- Backfill status for older rows
UPDATE public.products
SET moderation_status = CASE WHEN is_active THEN 'approved' ELSE 'pending' END
WHERE moderation_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_moderation_status
  ON public.products(moderation_status);

CREATE INDEX IF NOT EXISTS idx_products_stock_threshold
  ON public.products(stock, low_stock_threshold);

-- Return automation metadata
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_decision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS decision_rule TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_returns_auto_decision
  ON public.returns(auto_decision);
