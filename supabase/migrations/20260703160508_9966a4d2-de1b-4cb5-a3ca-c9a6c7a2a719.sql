
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'email_status'::regtype AND enumlabel = 'failed') THEN
    ALTER TYPE email_status ADD VALUE 'failed';
  END IF;
END $$;
