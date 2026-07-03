ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS sender_email text,
  ADD COLUMN IF NOT EXISTS sender_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_verified_at timestamptz;