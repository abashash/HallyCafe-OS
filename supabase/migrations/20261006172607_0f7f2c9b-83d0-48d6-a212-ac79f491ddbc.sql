ALTER TABLE public.public_site_settings
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS telegram_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS waze_url text,
  ADD COLUMN IF NOT EXISTS neshan_url text,
  ADD COLUMN IF NOT EXISTS balad_url text;

DROP POLICY IF EXISTS "al read" ON public.alerts;
DROP POLICY IF EXISTS "al write" ON public.alerts;
DROP POLICY IF EXISTS "alerts read" ON public.alerts;
DROP POLICY IF EXISTS "alerts write" ON public.alerts;
DROP POLICY IF EXISTS "alerts update" ON public.alerts;
DROP POLICY IF EXISTS "alerts delete" ON public.alerts;
CREATE POLICY "Admins can read alerts" ON public.alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete alerts" ON public.alerts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "hist read" ON public.ingredient_price_history;
DROP POLICY IF EXISTS "hist write" ON public.ingredient_price_history;
CREATE POLICY "Admins can read ingredient price history" ON public.ingredient_price_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create ingredient price history" ON public.ingredient_price_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ms read" ON public.monthly_sales;
DROP POLICY IF EXISTS "ms write" ON public.monthly_sales;
DROP POLICY IF EXISTS "monthly sales update" ON public.monthly_sales;
DROP POLICY IF EXISTS "monthly sales delete" ON public.monthly_sales;
CREATE POLICY "Admins can read monthly sales" ON public.monthly_sales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create monthly sales" ON public.monthly_sales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update monthly sales" ON public.monthly_sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete monthly sales" ON public.monthly_sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));