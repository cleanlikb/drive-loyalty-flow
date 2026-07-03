
DO $$
DECLARE
  proj_url text;
  cron_secret text := '90307c74af0216fa0f810ee17b50e52382c2f5dcbb4793ceabf5db5d1c33f283';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(cron_secret, 'CRON_SECRET');
  ELSE
    PERFORM vault.update_secret(existing_id, cron_secret);
  END IF;

  SELECT decrypted_secret INTO proj_url FROM vault.decrypted_secrets WHERE name = 'PROJECT_URL' LIMIT 1;

  PERFORM cron.unschedule('rescan-replies-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rescan-replies-daily');

  PERFORM cron.schedule(
    'rescan-replies-daily',
    '15 4 * * *',
    format($f$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
      body := '{}'::jsonb
    );$f$, proj_url || '/api/public/cron/rescan-replies', cron_secret)
  );
END $$;
