DO $$
DECLARE
  proj_url text;
  anon_key text;
BEGIN
  SELECT decrypted_secret INTO proj_url FROM vault.decrypted_secrets WHERE name = 'PROJECT_URL' LIMIT 1;
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_PUBLISHABLE_KEY' LIMIT 1;

  PERFORM cron.unschedule('rescan-replies-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rescan-replies-daily');

  PERFORM cron.schedule(
    'rescan-replies-daily',
    '15 4 * * *',
    format($f$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
      body := '{}'::jsonb
    );$f$, proj_url || '/api/public/cron/rescan-replies', anon_key)
  );
END $$;