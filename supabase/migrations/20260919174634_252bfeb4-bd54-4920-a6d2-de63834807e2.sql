DROP POLICY IF EXISTS "al delete" ON public.alerts;
CREATE POLICY "al delete" ON public.alerts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "al update" ON public.alerts;
CREATE POLICY "al update" ON public.alerts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "set update" ON public.app_settings;
CREATE POLICY "set update" ON public.app_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);