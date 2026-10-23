
-- roles
create type public.app_role as enum ('admin','staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "roles readable by authenticated" on public.user_roles for select to authenticated using (true);
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- first user becomes admin, others staff
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  select count(*) into cnt from public.user_roles;
  insert into public.user_roles (user_id, role)
  values (new.id, case when cnt = 0 then 'admin'::public.app_role else 'staff'::public.app_role end)
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat read" on public.categories for select to authenticated using (true);
create policy "cat write" on public.categories for insert to authenticated with check (true);
create policy "cat update" on public.categories for update to authenticated using (true);
create policy "cat delete" on public.categories for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger t_cat_upd before update on public.categories for each row execute function public.set_updated_at();

-- suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  contact_person text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "sup read" on public.suppliers for select to authenticated using (true);
create policy "sup write" on public.suppliers for insert to authenticated with check (true);
create policy "sup update" on public.suppliers for update to authenticated using (true);
create policy "sup delete" on public.suppliers for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger t_sup_upd before update on public.suppliers for each row execute function public.set_updated_at();

-- ingredients (raw materials). base_unit: g | ml | pcs. avg_cost = thousand tomans per base unit
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_unit text not null default 'g' check (base_unit in ('g','ml','pcs')),
  avg_cost numeric not null default 0,
  last_cost numeric not null default 0,
  stock_qty numeric not null default 0,
  min_stock numeric not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ingredients to authenticated;
grant all on public.ingredients to service_role;
alter table public.ingredients enable row level security;
create policy "ing read" on public.ingredients for select to authenticated using (true);
create policy "ing write" on public.ingredients for insert to authenticated with check (true);
create policy "ing update" on public.ingredients for update to authenticated using (true);
create policy "ing delete" on public.ingredients for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger t_ing_upd before update on public.ingredients for each row execute function public.set_updated_at();

create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  unit_cost numeric not null,
  avg_cost_after numeric not null,
  source text not null default 'invoice',
  changed_at timestamptz not null default now()
);
grant select, insert on public.ingredient_price_history to authenticated;
grant all on public.ingredient_price_history to service_role;
alter table public.ingredient_price_history enable row level security;
create policy "hist read" on public.ingredient_price_history for select to authenticated using (true);
create policy "hist write" on public.ingredient_price_history for insert to authenticated with check (true);

-- menu items
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  selling_price numeric not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
create policy "mi read" on public.menu_items for select to authenticated using (true);
create policy "mi write" on public.menu_items for insert to authenticated with check (true);
create policy "mi update" on public.menu_items for update to authenticated using (true);
create policy "mi delete" on public.menu_items for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger t_mi_upd before update on public.menu_items for each row execute function public.set_updated_at();

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric not null default 0,
  unit text not null default 'g' check (unit in ('g','kg','ml','L','pcs')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recipe_items to authenticated;
grant all on public.recipe_items to service_role;
alter table public.recipe_items enable row level security;
create policy "ri read" on public.recipe_items for select to authenticated using (true);
create policy "ri write" on public.recipe_items for insert to authenticated with check (true);
create policy "ri update" on public.recipe_items for update to authenticated using (true);
create policy "ri delete" on public.recipe_items for delete to authenticated using (true);

-- invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_date date not null default current_date,
  invoice_number text,
  notes text,
  total_amount numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "inv read" on public.invoices for select to authenticated using (true);
create policy "inv write" on public.invoices for insert to authenticated with check (true);
create policy "inv update" on public.invoices for update to authenticated using (true);
create policy "inv delete" on public.invoices for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger t_inv_upd before update on public.invoices for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric not null,
  unit text not null default 'g' check (unit in ('g','kg','ml','L','pcs')),
  total_price numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoice_items to authenticated;
grant all on public.invoice_items to service_role;
alter table public.invoice_items enable row level security;
create policy "ii read" on public.invoice_items for select to authenticated using (true);
create policy "ii write" on public.invoice_items for insert to authenticated with check (true);
create policy "ii update" on public.invoice_items for update to authenticated using (true);
create policy "ii delete" on public.invoice_items for delete to authenticated using (true);

-- alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null default 'warning',
  message text not null,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "al read" on public.alerts for select to authenticated using (true);
create policy "al write" on public.alerts for insert to authenticated with check (true);
create policy "al update" on public.alerts for update to authenticated using (true);
create policy "al delete" on public.alerts for delete to authenticated using (true);

-- waste
create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric not null,
  unit text not null default 'g' check (unit in ('g','kg','ml','L','pcs')),
  reason text,
  cost numeric not null default 0,
  waste_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.waste_records to authenticated;
grant all on public.waste_records to service_role;
alter table public.waste_records enable row level security;
create policy "wa read" on public.waste_records for select to authenticated using (true);
create policy "wa write" on public.waste_records for insert to authenticated with check (true);
create policy "wa update" on public.waste_records for update to authenticated using (true);
create policy "wa delete" on public.waste_records for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit read" on public.audit_log for select to authenticated using (true);
create policy "audit write" on public.audit_log for insert to authenticated with check (true);

-- unit conversion to base unit
create or replace function public.to_base_qty(_qty numeric, _unit text)
returns numeric language sql immutable set search_path = public as $$
  select case when _unit in ('kg','L') then _qty * 1000 else _qty end
$$;

-- weighted average cost update on invoice item insert
create or replace function public.apply_invoice_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_qty numeric;
  unit_cost numeric;
  ing record;
  new_avg numeric;
  pct numeric;
begin
  base_qty := public.to_base_qty(new.quantity, new.unit);
  if base_qty is null or base_qty <= 0 then
    return new;
  end if;
  unit_cost := new.total_price / base_qty;
  select * into ing from public.ingredients where id = new.ingredient_id for update;
  if not found then return new; end if;

  if ing.stock_qty > 0 and ing.avg_cost > 0 then
    new_avg := ((ing.stock_qty * ing.avg_cost) + new.total_price) / (ing.stock_qty + base_qty);
  else
    new_avg := unit_cost;
  end if;

  update public.ingredients
    set avg_cost = new_avg,
        last_cost = unit_cost,
        stock_qty = ing.stock_qty + base_qty
  where id = ing.id;

  insert into public.ingredient_price_history (ingredient_id, unit_cost, avg_cost_after, source)
  values (ing.id, unit_cost, new_avg, 'invoice');

  if ing.last_cost > 0 then
    pct := ((unit_cost - ing.last_cost) / ing.last_cost) * 100;
    if pct >= 15 then
      insert into public.alerts (type, severity, message, ingredient_id)
      values ('price_increase', case when pct >= 30 then 'critical' else 'warning' end,
        'افزایش قیمت ' || ing.name || ' به میزان ' || round(pct,1) || ' درصد', ing.id);
    end if;
  end if;

  update public.invoices set total_amount = (
    select coalesce(sum(total_price),0) from public.invoice_items where invoice_id = new.invoice_id
  ) where id = new.invoice_id;

  return new;
end; $$;

create trigger t_invoice_item_ai after insert on public.invoice_items
for each row execute function public.apply_invoice_item();

-- waste reduces stock and computes cost
create or replace function public.apply_waste()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_qty numeric; ing record;
begin
  base_qty := public.to_base_qty(new.quantity, new.unit);
  select * into ing from public.ingredients where id = new.ingredient_id for update;
  if found then
    new.cost := base_qty * ing.avg_cost;
    update public.ingredients set stock_qty = greatest(ing.stock_qty - base_qty, 0) where id = ing.id;
    if (ing.stock_qty - base_qty) <= ing.min_stock and ing.min_stock > 0 then
      insert into public.alerts (type, severity, message, ingredient_id)
      values ('low_stock','warning','موجودی ' || ing.name || ' کمتر از حد مجاز است', ing.id);
    end if;
  end if;
  return new;
end; $$;

create trigger t_waste_bi before insert on public.waste_records
for each row execute function public.apply_waste();
