CREATE OR REPLACE FUNCTION public.current_dealer_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT id FROM public.dealers WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dealers (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;