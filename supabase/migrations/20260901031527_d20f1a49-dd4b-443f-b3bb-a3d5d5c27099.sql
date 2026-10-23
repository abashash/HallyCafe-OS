CREATE POLICY "invoice images read" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'invoice-images');

CREATE POLICY "invoice images insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoice-images');

CREATE POLICY "invoice images update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'invoice-images');

CREATE POLICY "invoice images delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'invoice-images');