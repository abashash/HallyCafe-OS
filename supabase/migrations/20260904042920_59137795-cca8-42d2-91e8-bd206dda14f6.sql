ALTER TABLE public.app_settings ALTER COLUMN currency_label SET DEFAULT 'ریال';
UPDATE public.app_settings SET currency_label = 'ریال';