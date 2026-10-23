CREATE POLICY "public reads branding images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'public-branding');

CREATE POLICY "admins insert branding images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-branding'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "admins update branding images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-branding'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'public-branding'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "admins delete branding images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-branding'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);