/** Price variants of a menu item. `primary` marks the label of selling_price itself. */
export type PriceOption = { label: string; price: number; primary?: boolean };

export function parsePriceOptions(value: unknown): PriceOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const o = v as { label?: unknown; price?: unknown; primary?: unknown };
    const label = typeof o.label === "string" ? o.label : "";
    const price = Number(o.price);
    if (!label || !Number.isFinite(price)) return [];
    return [{ label, price, primary: o.primary === true }];
  });
}

/** All prices to show publicly: primary first, then extra variants. */
export function displayPrices(sellingPrice: number, value: unknown): PriceOption[] {
  const opts = parsePriceOptions(value);
  const primary = opts.find((o) => o.primary);
  return [
    { label: primary?.label ?? "", price: sellingPrice, primary: true },
    ...opts.filter((o) => !o.primary),
  ];
}
