import {
  formatJalaliDate,
  getActiveDigitLocale,
  isoToJalaliParts,
  JALALI_MONTHS,
  JALALI_MONTHS_EN,
  localizeDigits,
} from "./jalali";

export type UnitCategory = "weight" | "volume" | "count";
export type BaseUnit = "g" | "ml" | "pcs";

export type WeightUnit = "mg" | "g" | "kg";
export type VolumeUnit = "ml" | "L";
export type CountUnit =
  | "pcs"
  | "pack"
  | "pouch"
  | "box"
  | "carton"
  | "roll"
  | "sheet"
  | "pair"
  | "set"
  | "bottle"
  | "can"
  | "container"
  | "bucket"
  | "gallon"
  | "jerrycan";

export type Unit = WeightUnit | VolumeUnit | CountUnit;

export const UNIT_LABELS: Record<Unit, string> = {
  mg: "میلی‌گرم",
  g: "گرم",
  kg: "کیلوگرم",
  ml: "میلی‌لیتر",
  L: "لیتر",
  pcs: "عدد",
  pack: "بسته",
  pouch: "پاکت",
  box: "جعبه",
  carton: "کارتن",
  roll: "رول",
  sheet: "ورق",
  pair: "جفت",
  set: "ست",
  bottle: "بطری",
  can: "قوطی",
  container: "ظرف",
  bucket: "سطل",
  gallon: "گالن",
  jerrycan: "دبه",
};

export const CATEGORY_LABELS: Record<UnitCategory, string> = {
  weight: "وزنی",
  volume: "حجمی",
  count: "تعدادی",
};

export const BASE_UNIT_LABELS: Record<BaseUnit, string> = {
  g: "گرم",
  ml: "میلی‌لیتر",
  pcs: "عدد",
};

export const BASE_UNIT_OF_CATEGORY: Record<UnitCategory, BaseUnit> = {
  weight: "g",
  volume: "ml",
  count: "pcs",
};

export const CATEGORY_OF_BASE_UNIT: Record<BaseUnit, UnitCategory> = {
  g: "weight",
  ml: "volume",
  pcs: "count",
};

const WEIGHT_UNITS: WeightUnit[] = ["mg", "g", "kg"];
const VOLUME_UNITS: VolumeUnit[] = ["ml", "L"];
const COUNT_UNITS: CountUnit[] = [
  "pcs",
  "pack",
  "pouch",
  "box",
  "carton",
  "roll",
  "sheet",
  "pair",
  "set",
  "bottle",
  "can",
  "container",
  "bucket",
  "gallon",
  "jerrycan",
];

/** ضریب ثابت تبدیل به واحد پایه (فقط برای واحدهای وزنی و حجمی) */
export const FIXED_UNIT_FACTORS: Partial<Record<Unit, number>> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  pcs: 1,
};

export function unitsForCategory(category: UnitCategory): Unit[] {
  if (category === "weight") return WEIGHT_UNITS;
  if (category === "volume") return VOLUME_UNITS;
  return COUNT_UNITS;
}

export function unitsForBase(base: BaseUnit): Unit[] {
  return unitsForCategory(CATEGORY_OF_BASE_UNIT[base]);
}

export function categoryOfUnit(unit: Unit | string): UnitCategory | null {
  if ((WEIGHT_UNITS as string[]).includes(unit)) return "weight";
  if ((VOLUME_UNITS as string[]).includes(unit)) return "volume";
  if ((COUNT_UNITS as string[]).includes(unit)) return "count";
  return null;
}

/** آیا واحد با دسته ماده اولیه سازگار است؟ */
export function isUnitCompatible(unit: Unit | string, category: UnitCategory): boolean {
  return categoryOfUnit(unit) === category;
}

/** ضریب تبدیل پیشنهادی هر واحد خرید به واحد پایه */
export function defaultConversionFactor(unit: Unit | string): number {
  return FIXED_UNIT_FACTORS[unit as Unit] ?? 1;
}

/** آیا ضریب تبدیل توسط کاربر تعریف می‌شود؟ (واحدهای تعدادی) */
export function isUserDefinedFactor(unit: Unit | string): boolean {
  return categoryOfUnit(unit) === "count" && unit !== "pcs";
}

/**
 * تبدیل مقدار به واحد پایه.
 * واحدهای وزنی/حجمی ضریب ثابت دارند؛ واحدهای تعدادی از ضریب تبدیل کاربر استفاده می‌کنند.
 */
export function toBaseQty(qty: number, unit: Unit | string, conversionFactor?: number): number {
  const fixed = FIXED_UNIT_FACTORS[unit as Unit];
  const factor = fixed ?? (conversionFactor && conversionFactor > 0 ? conversionFactor : 1);
  return Number(qty) * factor;
}

const nfFa = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const nfFa4 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 4 });
const nfEn = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const nfEn4 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export function fmtNum(n: number | null | undefined): string {
  const lang = getActiveDigitLocale();
  if (n === null || n === undefined || Number.isNaN(n)) return lang === "en" ? "0" : "۰";
  return lang === "en" ? nfEn.format(n) : nfFa.format(n);
}

export function fmtNum4(n: number | null | undefined): string {
  const lang = getActiveDigitLocale();
  if (n === null || n === undefined || Number.isNaN(n)) return lang === "en" ? "0" : "۰";
  return lang === "en" ? nfEn4.format(n) : nfFa4.format(n);
}

/** مبالغ به ریال ذخیره می‌شوند */
export function fmtPrice(n: number | null | undefined): string {
  const lang = getActiveDigitLocale();
  return lang === "en" ? `${fmtNum(n)} IRR` : `${fmtNum(n)} ریال`;
}

/** مبالغ کوچک (قیمت هر واحد پایه) با دقت بیشتر */
export function fmtPrice4(n: number | null | undefined): string {
  const lang = getActiveDigitLocale();
  return lang === "en" ? `${fmtNum4(n)} IRR` : `${fmtNum4(n)} ریال`;
}

export function fmtPercent(n: number | null | undefined): string {
  const lang = getActiveDigitLocale();
  return lang === "en" ? `${fmtNum(n)}%` : `${fmtNum(n)}٪`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  return formatJalaliDate(value);
}

/** تاریخ شمسی با نام ماه، مثل «۱۲ مرداد ۱۴۰۵» یا «12 Mordad 1405» */
export function fmtDateLong(value: string | null | undefined): string {
  if (!value) return "-";
  const lang = getActiveDigitLocale();
  const j = isoToJalaliParts(value);
  if (!j) return localizeDigits(value, lang);
  const monthName = lang === "en" ? JALALI_MONTHS_EN[j.jm - 1] : JALALI_MONTHS[j.jm - 1];
  return localizeDigits(`${j.jd} ${monthName} ${j.jy}`, lang);
}
