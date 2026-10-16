-- Add delivery-related contact columns to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Backfill any existing rows with empty values where needed
UPDATE public.profiles
SET phone = COALESCE(phone, ''),
    address = COALESCE(address, '');
