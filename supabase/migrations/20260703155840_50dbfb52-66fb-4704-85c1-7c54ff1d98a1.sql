
-- Add "bounced" to email_status enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'email_status'::regtype AND enumlabel = 'bounced') THEN
    ALTER TYPE email_status ADD VALUE 'bounced';
  END IF;
END $$;

-- Engagement tracking columns
ALTER TABLE public.sequence_emails
  ADD COLUMN IF NOT EXISTS reply_alias TEXT,
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS sequence_emails_reply_alias_key
  ON public.sequence_emails (reply_alias) WHERE reply_alias IS NOT NULL;

CREATE INDEX IF NOT EXISTS sequence_emails_resend_email_id_idx
  ON public.sequence_emails (resend_email_id) WHERE resend_email_id IS NOT NULL;
