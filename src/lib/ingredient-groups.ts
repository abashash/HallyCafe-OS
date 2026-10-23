/** دسته‌بندی انباری مواد اولیه (نوع ماده، مستقل از دسته واحد) */
export type IngredientGroup =
  | "vegetable"
  | "fruit"
  | "protein"
  | "dairy"
  | "grain"
  | "coffee_tea"
  | "beverage"
  | "syrup_sauce"
  | "sweetener"
  | "spice"
  | "bakery"
  | "frozen"
  | "packaging"
  | "cleaning"
  | "other";

export const INGREDIENT_GROUP_LABELS: Record<IngredientGroup, string> = {
  vegetable: "سبزیجات",
  fruit: "میوه",
  protein: "پروتئین",
  dairy: "لبنیات",
  grain: "غلات و خشکبار",
  coffee_tea: "قهوه و چای",
  beverage: "نوشیدنی",
  syrup_sauce: "سس و سیروپ",
  sweetener: "شیرین‌کننده",
  spice: "ادویه و افزودنی",
  bakery: "نان و شیرینی",
  frozen: "منجمد",
  packaging: "بسته‌بندی و یکبارمصرف",
  cleaning: "شوینده و بهداشتی",
  other: "سایر",
};

export const INGREDIENT_GROUPS = Object.keys(INGREDIENT_GROUP_LABELS) as IngredientGroup[];

export function ingredientGroupLabel(value: string | null | undefined): string {
  return INGREDIENT_GROUP_LABELS[(value ?? "other") as IngredientGroup] ?? "سایر";
}
