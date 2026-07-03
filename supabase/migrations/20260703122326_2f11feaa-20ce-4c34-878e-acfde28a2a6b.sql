ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS daily_send_cap integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS send_window_start_hour integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS send_window_end_hour integer NOT NULL DEFAULT 16;