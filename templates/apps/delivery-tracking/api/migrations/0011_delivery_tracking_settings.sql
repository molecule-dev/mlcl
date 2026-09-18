-- Settings columns added to the users table so the Settings page's
-- organization + API panels persist real values.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_hours text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_public_key text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_secret_key text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_webhook_secret text;
