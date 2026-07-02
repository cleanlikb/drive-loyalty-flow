DO $$ BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname ILIKE '%stock%';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.sequences DROP COLUMN IF EXISTS stock_id;
ALTER TABLE public.cohort_customers
  DROP COLUMN IF EXISTS best_stock_id,
  DROP COLUMN IF EXISTS match_score,
  DROP COLUMN IF EXISTS match_reasons;
ALTER TABLE public.dealers DROP COLUMN IF EXISTS stock_page_url;

DROP TABLE IF EXISTS public.stock_syncs CASCADE;
DROP TABLE IF EXISTS public.stock CASCADE;