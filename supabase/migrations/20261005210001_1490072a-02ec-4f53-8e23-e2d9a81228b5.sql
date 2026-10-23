CREATE TABLE public.public_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton = true),
  cafe_name text,
  logo_url text,
  cover_image_url text,
  primary_color text CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  surface_color text CHECK (surface_color IS NULL OR surface_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  home_title text,
  home_summary text,
  about_title text,
  about_body text,
  phone text,
  email text,
  address text,
  opening_hours text,
  map_url text,
  instagram_url text,
  custom_links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(custom_links) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_site_settings TO authenticated;
GRANT SELECT ON public.public_site_settings TO anon;
GRANT ALL ON public.public_site_settings TO service_role;

ALTER TABLE public.public_site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public site settings are readable"
ON public.public_site_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admins insert public site settings"
ON public.public_site_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update public site settings"
ON public.public_site_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete public site settings"
ON public.public_site_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_public_site_settings_updated_at
BEFORE UPDATE ON public.public_site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "audit write" ON public.audit_log;
CREATE POLICY "users write own audit entries"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND user_email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "ri read" ON public.recipe_items;
DROP POLICY IF EXISTS "ri write" ON public.recipe_items;
DROP POLICY IF EXISTS "ri update" ON public.recipe_items;
DROP POLICY IF EXISTS "ri delete" ON public.recipe_items;
CREATE POLICY "admins read recipe items"
ON public.recipe_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins insert recipe items"
ON public.recipe_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins update recipe items"
ON public.recipe_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins delete recipe items"
ON public.recipe_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "ii read" ON public.invoice_items;
DROP POLICY IF EXISTS "ii write" ON public.invoice_items;
DROP POLICY IF EXISTS "ii update" ON public.invoice_items;
DROP POLICY IF EXISTS "ii delete" ON public.invoice_items;
CREATE POLICY "admins read invoice items"
ON public.invoice_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins insert invoice items"
ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins update invoice items"
ON public.invoice_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins delete invoice items"
ON public.invoice_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));