-- INGREDIENTS: unit system
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS unit_category text NOT NULL DEFAULT 'weight',
  ADD COLUMN IF NOT EXISTS purchase_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS conversion_factor numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS last_purchase_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_qty_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_cost_total numeric NOT NULL DEFAULT 0;

UPDATE public.ingredients SET
  unit_category = CASE base_unit WHEN 'g' THEN 'weight' WHEN 'ml' THEN 'volume' ELSE 'count' END,
  purchase_unit = CASE base_unit WHEN 'g' THEN 'kg' WHEN 'ml' THEN 'L' ELSE 'pcs' END,
  conversion_factor = CASE base_unit WHEN 'g' THEN 1000 WHEN 'ml' THEN 1000 ELSE 1 END;

-- INVOICES: payment info + images
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

-- INVOICE ITEMS: purchase unit + conversion
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS conversion_factor numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_unit_price numeric NOT NULL DEFAULT 0;

-- PRICE HISTORY: keep purchase context (never overwritten)
ALTER TABLE public.ingredient_price_history
  ADD COLUMN IF NOT EXISTS purchase_unit text,
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS conversion_factor numeric,
  ADD COLUMN IF NOT EXISTS quantity numeric;

-- Correct weighted-average cost engine (base-unit only)
CREATE OR REPLACE FUNCTION public.apply_invoice_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  cf numeric;
  base_qty numeric;
  unit_cost numeric;
  ing record;
  new_avg numeric;
  pct numeric;
begin
  select * into ing from public.ingredients where id = new.ingredient_id for update;
  if not found then return new; end if;

  cf := coalesce(nullif(new.conversion_factor, 0), 1);
  base_qty := new.quantity * cf;
  if base_qty is null or base_qty <= 0 then
    return new;
  end if;

  unit_cost := new.total_price / base_qty;

  new.base_quantity := base_qty;
  new.base_unit_price := unit_cost;
  if new.unit_price = 0 and new.quantity <> 0 then
    new.unit_price := new.total_price / new.quantity;
  end if;

  new_avg := (ing.purchased_cost_total + new.total_price)
             / nullif(ing.purchased_qty_total + base_qty, 0);
  if new_avg is null then new_avg := unit_cost; end if;

  update public.ingredients
    set avg_cost = new_avg,
        last_cost = unit_cost,
        last_purchase_price = new.total_price / nullif(new.quantity, 0),
        purchase_unit = new.unit,
        conversion_factor = cf,
        purchased_qty_total = ing.purchased_qty_total + base_qty,
        purchased_cost_total = ing.purchased_cost_total + new.total_price
  where id = ing.id;

  insert into public.ingredient_price_history
    (ingredient_id, unit_cost, avg_cost_after, source, purchase_unit, purchase_price, conversion_factor, quantity)
  values (ing.id, unit_cost, new_avg, 'invoice', new.unit,
          new.total_price / nullif(new.quantity, 0), cf, new.quantity);

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
end; $function$;

DROP TRIGGER IF EXISTS t_invoice_item_ai ON public.invoice_items;
CREATE TRIGGER t_invoice_item_bi
BEFORE INSERT ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.apply_invoice_item();

-- SECURITY FIXES
DROP POLICY IF EXISTS "audit read" ON public.audit_log;
CREATE POLICY "audit read admins" ON public.audit_log
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by owner or admin" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "roles readable by owner or admin" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));