
ALTER TYPE reply_classification ADD VALUE IF NOT EXISTS 'hot_lead';

ALTER TABLE public.replies
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS message_id text,
  ADD COLUMN IF NOT EXISTS in_reply_to text,
  ADD COLUMN IF NOT EXISTS forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_car_notes text,
  ADD COLUMN IF NOT EXISTS rescanned_at timestamptz;

CREATE INDEX IF NOT EXISTS replies_dealer_created_idx ON public.replies (dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS replies_message_id_idx ON public.replies (message_id) WHERE message_id IS NOT NULL;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_hot_lead boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_car_notes text,
  ADD COLUMN IF NOT EXISTS hot_lead_at timestamptz;

ALTER TABLE public.sequence_emails
  ADD COLUMN IF NOT EXISTS message_id text;
CREATE INDEX IF NOT EXISTS sequence_emails_message_id_idx ON public.sequence_emails (message_id) WHERE message_id IS NOT NULL;

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS forward_replies boolean NOT NULL DEFAULT true;
