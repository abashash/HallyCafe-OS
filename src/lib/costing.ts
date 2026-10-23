import { toBaseQty, type Unit, type UnitCategory } from "./units";

/**
 * موتور محاسبه بهای تمام‌شده.
 * قانون: هر محاسبه فقط و فقط با «قیمت هر واحد پایه» انجام می‌شود.
 * قیمت خرید → تبدیل به واحد پایه → قیمت واحد پایه → ضرب در مقدار رسپی
 */

export type IngredientLite = {
  id: string;
  name: string;
  avg_cost: number; // قیمت هر واحد پایه (میانگین موزون)
  base_unit: string;
  unit_category?: string | null;
  purchase_unit?: string | null;
  conversion_factor?: number | null;
};

export type RecipeLine = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
};

/** قیمت هر واحد پایه از روی قیمت خرید و ضریب تبدیل */
export function baseUnitPrice(purchasePrice: number, conversionFactor: number): number {
  const cf = Number(conversionFactor);
  if (!cf || cf <= 0) return 0;
  return Number(purchasePrice) / cf;
}

/** میانگین موزون بر اساس مقدار (به واحد پایه) */
export function weightedAverage(
  prevQty: number,
  prevCost: number,
  newQty: number,
  newCost: number,
): number {
  const qty = Number(prevQty) + Number(newQty);
  if (qty <= 0) return 0;
  return (Number(prevCost) + Number(newCost)) / qty;
}

export function lineCost(line: RecipeLine, ing?: IngredientLite): number {
  if (!ing) return 0;
  const baseQty = toBaseQty(
    Number(line.quantity),
    line.unit as Unit,
    Number(ing.conversion_factor ?? 1),
  );
  return baseQty * Number(ing.avg_cost);
}

export function recipeCost(lines: RecipeLine[], ingredients: IngredientLite[]): number {
  const map = new Map(ingredients.map((i) => [i.id, i]));
  return lines.reduce((sum, l) => sum + lineCost(l, map.get(l.ingredient_id)), 0);
}

export function ingredientCategory(ing: IngredientLite): UnitCategory {
  if (
    ing.unit_category === "weight" ||
    ing.unit_category === "volume" ||
    ing.unit_category === "count"
  ) {
    return ing.unit_category;
  }
  return ing.base_unit === "ml" ? "volume" : ing.base_unit === "pcs" ? "count" : "weight";
}

export function foodCostPercent(cost: number, sellingPrice: number): number {
  if (!sellingPrice) return 0;
  return (cost / sellingPrice) * 100;
}

/** حاشیه سود ناخالص هر واحد */
export function contributionMargin(sellingPrice: number, variableCost: number): number {
  return Number(sellingPrice) - Number(variableCost);
}

/**
 * نقطه سر به سر بر حسب تعداد فروش این آیتم در ماه:
 * هزینه ثابت ماهانه ÷ حاشیه سود هر واحد
 */
export function breakEvenUnits(monthlyFixedCost: number, cm: number): number | null {
  if (cm <= 0) return null;
  return monthlyFixedCost / cm;
}

/** نقطه سر به سر بر حسب مبلغ فروش */
export function breakEvenRevenue(
  monthlyFixedCost: number,
  sellingPrice: number,
  variableCost: number,
): number | null {
  const cm = contributionMargin(sellingPrice, variableCost);
  const units = breakEvenUnits(monthlyFixedCost, cm);
  return units === null ? null : units * sellingPrice;
}

/** سهم هزینه ثابت از هر واحد بر اساس تعداد فروش تخمینی ماهانه */
export function fixedCostPerUnit(monthlyFixedCost: number, monthlySalesUnits: number): number {
  if (!monthlySalesUnits) return 0;
  return monthlyFixedCost / monthlySalesUnits;
}

/** سهم سربار هر واحد از یک آیتم بر اساس تعداد فروش ماهانه آن آیتم نسبت به کل فروش */
export function overheadPerUnit(
  monthlyOverhead: number,
  itemMonthlyQty: number,
  totalMonthlyQty: number,
): number {
  if (!totalMonthlyQty || !itemMonthlyQty) return 0;
  const share = (monthlyOverhead * itemMonthlyQty) / totalMonthlyQty;
  return share / itemMonthlyQty;
}

/** بهای تمام‌شده کامل هر واحد = مواد اولیه + سهم سربار */
export function totalUnitCost(materialCost: number, overhead: number): number {
  return Number(materialCost) + Number(overhead);
}

/** سود ناخالص هر واحد (قیمت فروش منهای بهای تمام‌شده کامل) */
export function grossProfit(sellingPrice: number, totalCost: number): number {
  return Number(sellingPrice) - Number(totalCost);
}

/** حاشیه سود درصدی */
export function profitMargin(sellingPrice: number, totalCost: number): number {
  if (!sellingPrice) return 0;
  return ((Number(sellingPrice) - Number(totalCost)) / Number(sellingPrice)) * 100;
}

/** آستانه هشدار حاشیه سود پایین */
export const LOW_MARGIN_THRESHOLD = 20;
