ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_options jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.menu_items.price_options IS 'Extra price variants: [{label text, price numeric}]; selling_price stays the primary price used for costing.';

DROP POLICY IF EXISTS "invoice images read" ON storage.objects;
DROP POLICY IF EXISTS "invoice images insert" ON storage.objects;
DROP POLICY IF EXISTS "invoice images update" ON storage.objects;
DROP POLICY IF EXISTS "invoice images delete" ON storage.objects;
CREATE POLICY "invoice images read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-images' AND public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "invoice images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-images' AND public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "invoice images update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-images' AND public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "invoice images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-images' AND public.has_role((select auth.uid()), 'admin'));