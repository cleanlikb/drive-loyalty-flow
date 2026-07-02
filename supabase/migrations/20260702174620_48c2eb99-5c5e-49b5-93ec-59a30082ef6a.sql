
-- Enums
CREATE TYPE public.customer_status AS ENUM ('active','no_longer_owns','unsubscribed');
CREATE TYPE public.sequence_status AS ENUM ('drafting','scheduled','active','completed','stopped','paused_rematch');
CREATE TYPE public.email_status AS ENUM ('draft','scheduled','sent','cancelled');
CREATE TYPE public.reply_classification AS ENUM ('replied','no_longer_owns','unsubscribe','interested');
CREATE TYPE public.stock_source AS ENUM ('scrape','csv','seed');

-- Dealers
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  dealership_name TEXT,
  salesperson_name TEXT,
  website_url TEXT,
  stock_page_url TEXT,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealers TO authenticated;
GRANT ALL ON public.dealers TO service_role;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealers self" ON public.dealers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: dealer_id for current user
CREATE OR REPLACE FUNCTION public.current_dealer_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.dealers WHERE user_id = auth.uid() LIMIT 1 $$;

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  vehicle_reg TEXT,
  make TEXT,
  model TEXT,
  trim TEXT,
  sale_date DATE,
  sale_price NUMERIC(10,2),
  finance_type TEXT,
  finance_term_months INT,
  status public.customer_status NOT NULL DEFAULT 'active',
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.customers(dealer_id);
CREATE INDEX ON public.customers(dealer_id, sale_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers by dealer" ON public.customers FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

-- Stock
CREATE TABLE public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  trim TEXT,
  price NUMERIC(10,2),
  image_url TEXT,
  listing_url TEXT,
  source public.stock_source NOT NULL DEFAULT 'scrape',
  active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stock(dealer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock TO authenticated;
GRANT ALL ON public.stock TO service_role;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock by dealer" ON public.stock FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.stock_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  source_url TEXT,
  items_found INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_syncs TO authenticated;
GRANT ALL ON public.stock_syncs TO service_role;
ALTER TABLE public.stock_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_syncs by dealer" ON public.stock_syncs FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

-- Cohorts
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cohorts by dealer" ON public.cohorts FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.cohort_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  milestone_months INT NOT NULL,
  best_stock_id UUID REFERENCES public.stock(id) ON DELETE SET NULL,
  match_score INT NOT NULL DEFAULT 0,
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected BOOLEAN NOT NULL DEFAULT false,
  sequence_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, customer_id)
);
CREATE INDEX ON public.cohort_customers(dealer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_customers TO authenticated;
GRANT ALL ON public.cohort_customers TO service_role;
ALTER TABLE public.cohort_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cohort_customers by dealer" ON public.cohort_customers FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

-- Sequences
CREATE TABLE public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  cohort_customer_id UUID REFERENCES public.cohort_customers(id) ON DELETE SET NULL,
  stock_id UUID REFERENCES public.stock(id) ON DELETE SET NULL,
  status public.sequence_status NOT NULL DEFAULT 'drafting',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sequences(dealer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequences TO authenticated;
GRANT ALL ON public.sequences TO service_role;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequences by dealer" ON public.sequences FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.sequence_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  step INT NOT NULL,
  send_offset_days INT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status public.email_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  UNIQUE (sequence_id, step)
);
CREATE INDEX ON public.sequence_emails(dealer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_emails TO authenticated;
GRANT ALL ON public.sequence_emails TO service_role;
ALTER TABLE public.sequence_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequence_emails by dealer" ON public.sequence_emails FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sequences(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  classification public.reply_classification NOT NULL DEFAULT 'replied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replies TO authenticated;
GRANT ALL ON public.replies TO service_role;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies by dealer" ON public.replies FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications by dealer" ON public.notifications FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activity_log(dealer_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity by dealer" ON public.activity_log FOR ALL
  USING (dealer_id = public.current_dealer_id())
  WITH CHECK (dealer_id = public.current_dealer_id());

-- Signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dealers (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
