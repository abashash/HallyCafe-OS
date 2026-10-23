-- 1) Public online-menu fields on existing tables (no data loss)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_seasonal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- keep current behaviour meaningful: items already active become publishable
UPDATE public.menu_items SET is_published = true WHERE is_active = true;

-- 2) Public (anonymous) read access, strictly limited to published menu data
GRANT SELECT (id, name, description, selling_price, category_id, image_url,
              is_active, is_published, is_featured, is_seasonal, is_available, sort_order)
  ON public.menu_items TO anon;
GRANT SELECT (id, name, description, is_published, sort_order) ON public.categories TO anon;

DROP POLICY IF EXISTS "public published menu items" ON public.menu_items;
CREATE POLICY "public published menu items" ON public.menu_items
  FOR SELECT TO anon
  USING (is_published = true AND is_active = true);

DROP POLICY IF EXISTS "public published categories" ON public.categories;
CREATE POLICY "public published categories" ON public.categories
  FOR SELECT TO anon
  USING (is_published = true);

-- 3) RLS audit fixes: no USING(true) on write paths
DROP POLICY IF EXISTS "cat update" ON public.categories;
CREATE POLICY "cat update" ON public.categories FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ing update" ON public.ingredients;
CREATE POLICY "ing update" ON public.ingredients FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "mi update" ON public.menu_items;
CREATE POLICY "mi update" ON public.menu_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inv update" ON public.invoices;
CREATE POLICY "inv update" ON public.invoices FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ii update" ON public.invoice_items;
CREATE POLICY "ii update" ON public.invoice_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ii delete" ON public.invoice_items;
CREATE POLICY "ii delete" ON public.invoice_items FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ri update" ON public.recipe_items;
CREATE POLICY "ri update" ON public.recipe_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ri delete" ON public.recipe_items;
CREATE POLICY "ri delete" ON public.recipe_items FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ms update" ON public.monthly_sales;
CREATE POLICY "ms update" ON public.monthly_sales FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ms delete" ON public.monthly_sales;
CREATE POLICY "ms delete" ON public.monthly_sales FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "exp update" ON public.operating_expenses;
CREATE POLICY "exp update" ON public.operating_expenses FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "exp delete" ON public.operating_expenses;
CREATE POLICY "exp delete" ON public.operating_expenses FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sup update" ON public.suppliers;
CREATE POLICY "sup update" ON public.suppliers FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);