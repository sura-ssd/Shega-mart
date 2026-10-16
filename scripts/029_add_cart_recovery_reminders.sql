-- Phase 3: Cart recovery reminders

CREATE TABLE IF NOT EXISTS public.cart_recovery_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'abandoned_cart',
  cart_item_count INTEGER NOT NULL DEFAULT 0,
  cart_total_amount NUMERIC NOT NULL DEFAULT 0,
  snapshot JSONB,
  reminded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_recovery_user_id
  ON public.cart_recovery_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_recovery_reminded_at
  ON public.cart_recovery_reminders(reminded_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_items_created_at
  ON public.cart_items(created_at DESC);

ALTER TABLE public.cart_recovery_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart recovery reminders" ON public.cart_recovery_reminders;
CREATE POLICY "Users can view own cart recovery reminders"
  ON public.cart_recovery_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage cart recovery reminders" ON public.cart_recovery_reminders;
CREATE POLICY "Admins can manage cart recovery reminders"
  ON public.cart_recovery_reminders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
