/**
 * تبدیل دقیق تاریخ میلادی/شمسی بر پایه الگوریتم jalaali-js (Borkowski)
 * سال‌های کبیسه با جدول breaks محاسبه می‌شوند (دقیق برای سال‌های ۱۱۷۸ تا ۱۶۳۳ شمسی).
 */

const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
];

function div(a: number, b: number) {
  return Math.trunc(a / b);
}
function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number) {
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0]!;
  if (jy < jp || jy >= breaks[bl - 1]!) throw new Error("Invalid Jalaali year " + jy);
  let jump = 0;
  let jm: number;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

/** آیا سال شمسی کبیسه است */
export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** تعداد روزهای ماه شمسی */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      const jm = 1 + div(k, 31);
      const jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (jalCal(jy).leap === 1) k += 1;
  }
  const jm = 7 + div(k, 30);
  const jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function toJalali(gy: number, gm: number, gd: number) {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const JALALI_MONTHS_EN = [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Shahrivar",
  "Mehr",
  "Aban",
  "Azar",
  "Dey",
  "Bahman",
  "Esfand",
];

export const JALALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
export const JALALI_WEEKDAYS_EN = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];

export type DigitLocale = "fa" | "en" | "ar";

let activeDigitLocale: DigitLocale = "fa";

export function setActiveDigitLocale(locale: DigitLocale): void {
  activeDigitLocale = locale;
}

export function getActiveDigitLocale(): DigitLocale {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem("hally_app_lang");
      if (saved === "en" || saved === "fa" || saved === "ar") {
        activeDigitLocale = saved;
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    if (typeof document !== "undefined" && document.documentElement.lang === "en") {
      return "en";
    }
  }
  return activeDigitLocale;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toEnglishDigits(input: string | number): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function localizeDigits(input: string | number, locale?: DigitLocale): string {
  const target = locale ?? getActiveDigitLocale();
  const en = toEnglishDigits(input);
  if (target === "en") {
    return en;
  }
  return en.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]!);
}

export function toPersianDigits(s: string | number, forcePersian = false): string {
  if (forcePersian) {
    return toEnglishDigits(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]!);
  }
  return localizeDigits(s);
}

/** "YYYY-MM-DD" میلادی → "۱۴۰۵/۰۸/۰۱" (یا "1405/08/01" در حالت انگلیسی) شمسی */
export function isoToJalaliString(iso: string, locale?: DigitLocale): string {
  const j = isoToJalaliParts(iso);
  if (!j) return localizeDigits(iso, locale);
  return localizeDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`, locale);
}

export function isoToJalaliParts(iso: string) {
  const normalized = toEnglishDigits(iso).trim();
  if (!normalized) return null;
  // Already a Jalali string like 1405/08/01 or 1405-08-01?
  const mSlash = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(normalized);
  if (mSlash) {
    const y = +mSlash[1]!;
    const m = +mSlash[2]!;
    const d = +mSlash[3]!;
    if (y >= 1300 && y <= 1500) {
      return { jy: y, jm: m, jd: d };
    }
    try {
      return toJalali(y, m, d);
    } catch {
      return null;
    }
  }
  const dt = new Date(normalized);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    return toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  } catch {
    return null;
  }
}

export function formatJalaliDate(
  value: string | Date | null | undefined,
  locale?: DigitLocale,
): string {
  if (!value) return "—";
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const j = isoToJalaliParts(iso);
  if (!j) return localizeDigits(iso, locale);
  return localizeDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`, locale);
}

export function formatJalaliTime(
  value: string | Date | null | undefined,
  locale?: DigitLocale,
): string {
  if (!value) return "—";
  if (value instanceof Date) {
    return localizeDigits(`${pad(value.getHours())}:${pad(value.getMinutes())}`, locale);
  }
  const normalized = toEnglishDigits(String(value)).trim();
  const timeMatch = /(\d{2}):(\d{2})/.exec(normalized);
  const dt = new Date(normalized);
  if (!Number.isNaN(dt.getTime()) && normalized.includes("T")) {
    return localizeDigits(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`, locale);
  }
  if (timeMatch) {
    return localizeDigits(`${timeMatch[1]}:${timeMatch[2]}`, locale);
  }
  return localizeDigits(normalized, locale);
}

export function formatJalaliDateTime(
  value: string | Date | null | undefined,
  locale?: DigitLocale,
): string {
  if (!value) return "—";
  const datePart = formatJalaliDate(value, locale);
  const timePart = formatJalaliTime(value, locale);
  if (
    timePart &&
    timePart !== "—" &&
    timePart !== datePart &&
    /\d{2}:\d{2}/.test(toEnglishDigits(timePart))
  ) {
    return `${datePart} - ${timePart}`;
  }
  return datePart;
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

export function todayJalali() {
  const d = new Date();
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** روز هفته شمسی: ۰ = شنبه */
export function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  const dow = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay(); // 0=Sunday
  return (dow + 1) % 7;
}
