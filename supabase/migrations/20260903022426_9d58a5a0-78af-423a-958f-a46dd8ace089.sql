ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS ingredient_group text NOT NULL DEFAULT 'other';

CREATE INDEX IF NOT EXISTS idx_ingredients_group ON public.ingredients (ingredient_group);