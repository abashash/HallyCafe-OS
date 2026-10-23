DROP TRIGGER IF EXISTS t_waste_bi ON public.waste_records;
DROP TABLE IF EXISTS public.waste_records;
DROP FUNCTION IF EXISTS public.apply_waste();
DELETE FROM public.alerts WHERE type = 'low_stock';

CREATE OR REPLACE FUNCTION public.apply_invoice_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  if ing.avg_cost > 0 then
    new_avg := (ing.avg_cost + unit_cost) / 2;
  else
    new_avg := unit_cost;
  end if;

  update public.ingredients
    set avg_cost = new_avg,
        last_cost = unit_cost
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
end; $function$;

CREATE TABLE public.monthly_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_sales TO authenticated;
GRANT ALL ON public.monthly_sales TO service_role;

ALTER TABLE public.monthly_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms read" ON public.monthly_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "ms write" ON public.monthly_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ms update" ON public.monthly_sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ms delete" ON public.monthly_sales FOR DELETE TO authenticated USING (true);

CREATE TRIGGER t_ms_upd BEFORE UPDATE ON public.monthly_sales
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();