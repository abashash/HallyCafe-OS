CREATE TABLE public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other',
  amount numeric not null default 0,
  expense_date date not null default current_date,
  is_monthly boolean not null default true,
  notes text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operating_expenses TO authenticated;
GRANT ALL ON public.operating_expenses TO service_role;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp read" ON public.operating_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp write" ON public.operating_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exp update" ON public.operating_expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "exp delete" ON public.operating_expenses FOR DELETE TO authenticated USING (true);
CREATE TRIGGER t_exp_upd BEFORE UPDATE ON public.operating_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.app_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  monthly_sales_units numeric not null default 0,
  currency_label text not null default 'هزار تومان',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "set read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "set write" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "set update" ON public.app_settings FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER t_set_upd BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_settings (singleton, monthly_sales_units) VALUES (true, 0);

CREATE OR REPLACE FUNCTION public.to_base_qty(_qty numeric, _unit text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  select case _unit
    when 'mg' then _qty / 1000.0
    when 'g' then _qty
    when 'kg' then _qty * 1000
    when 'ml' then _qty
    when 'cl' then _qty * 10
    when 'L' then _qty * 1000
    else _qty
  end
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'admin'::public.app_role)
  on conflict do nothing;
  return new;
end; $function$;