import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  setActiveDigitLocale,
  toEnglishDigits,
} from "@/lib/jalali";

export type AppLanguage = "fa" | "en" | "ar";

export const LANGUAGE_META: Record<
  AppLanguage,
  { code: AppLanguage; label: string; nativeLabel: string; dir: "rtl" | "ltr"; locale: string }
> = {
  fa: {
    code: "fa",
    label: "Persian",
    nativeLabel: "فارسی",
    dir: "rtl",
    locale: "fa-IR",
  },
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    dir: "ltr",
    locale: "en-US",
  },
  ar: {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    dir: "rtl",
    locale: "ar-SA",
  },
};

export type TrilingualText = {
  fa: string;
  en: string;
  ar: string;
};

const STORAGE_KEY = "hally_app_lang";

const COMMON_CATEGORY_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  "بار گرم": { en: "Hot Bar", ar: "المشروبات الساخنة" },
  "بار سرد": { en: "Cold Bar", ar: "المشروبات الباردة" },
  "قهوه تخصصی": { en: "Specialty Coffee", ar: "القهوة المختصة" },
  "قهوه دمی": { en: "Brewed Coffee", ar: "القهوة المقطرة" },
  اسپرسو: { en: "Espresso Bar", ar: "إسبريسو" },
  "چای و دمنوش": { en: "Tea & Herbal Infusions", ar: "الشاي والأعشاب" },
  چای: { en: "Tea", ar: "شاي" },
  دمنوش: { en: "Herbal Tea", ar: "أعشاب طبيعية" },
  شیک: { en: "Milkshakes", ar: "ميلك شيك" },
  "شیک ها": { en: "Milkshakes", ar: "ميلك شيك" },
  اسموتی: { en: "Smoothies", ar: "سموذي" },
  "ماکتل و نوشیدنی سرد": { en: "Mocktails & Cold Drinks", ar: "موكتيل ومشروبات باردة" },
  ماکتل: { en: "Mocktails", ar: "موكتيل" },
  "کیک و دسر": { en: "Cakes & Desserts", ar: "الكيك والحلويات" },
  کیک: { en: "Cakes", ar: "كيك" },
  دسر: { en: "Desserts", ar: "حلويات" },
  صبحانه: { en: "Breakfast", ar: "الفطور" },
  "غذا و ساندویچ": { en: "Main Dishes & Sandwiches", ar: "الأطباق والسندويشات" },
  پیتزا: { en: "Pizza", ar: "بيتزا" },
  برگر: { en: "Burgers", ar: "برغر" },
  پاستا: { en: "Pasta", ar: "باستا" },
  سالاد: { en: "Salads", ar: "سلطات" },
  پیش‌غذا: { en: "Appetizers", ar: "مقبلات" },
  بستنی: { en: "Ice Cream", ar: "آيس كريم" },
  سایر: { en: "Other", ar: "أخرى" },
};

type I18nContextValue = {
  lang: AppLanguage;
  dir: "rtl" | "ltr";
  locale: string;
  setLang: (lang: AppLanguage) => void;
  t: (fa: string, en?: string, ar?: string) => string;
  pick: (obj: TrilingualText) => string;
  formatNumber: (value: number) => string;
  formatMoney: (rialOrToman: number, currencyLabel?: string) => string;
  formatDate: (value: string | Date | null | undefined) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  translateCategory: (name: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
        if (saved === "fa" || saved === "en" || saved === "ar") {
          setActiveDigitLocale(saved);
          return saved;
        }
      } catch {
        // ignore storage errors
      }
    }
    return "fa";
  });

  setActiveDigitLocale(lang);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (saved === "fa" || saved === "en" || saved === "ar") {
        setActiveDigitLocale(saved);
        setLangState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const meta = LANGUAGE_META[lang];
    setActiveDigitLocale(lang);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setActiveDigitLocale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (fa: string, en?: string, ar?: string) => {
      if (lang === "en") return en ? toEnglishDigits(en) : fa;
      if (lang === "ar") return ar ?? fa;
      return fa;
    },
    [lang],
  );

  const pick = useCallback(
    (obj: TrilingualText) => {
      if (lang === "en") return toEnglishDigits(obj.en || obj.fa);
      if (lang === "ar") return obj.ar || obj.fa;
      return obj.fa;
    },
    [lang],
  );

  const formatNumber = useCallback(
    (value: number) => {
      const num = Number.isFinite(value) ? value : 0;
      if (lang === "en") {
        return Math.round(num).toLocaleString("en-US");
      }
      return Math.round(num).toLocaleString(LANGUAGE_META[lang].locale);
    },
    [lang],
  );

  const formatMoney = useCallback(
    (value: number, currencyLabel?: string) => {
      const num = Number.isFinite(value) ? value : 0;
      const formatted =
        lang === "en"
          ? Math.round(num).toLocaleString("en-US")
          : Math.round(num).toLocaleString(LANGUAGE_META[lang].locale);
      const unit =
        lang === "en"
          ? currencyLabel && currencyLabel !== "ریال"
            ? toEnglishDigits(currencyLabel)
            : "IRR"
          : (currencyLabel ?? (lang === "ar" ? "ريال" : "ریال"));
      return `${formatted} ${unit}`;
    },
    [lang],
  );

  const formatDate = useCallback(
    (value: string | Date | null | undefined) => formatJalaliDate(value, lang),
    [lang],
  );

  const formatDateTime = useCallback(
    (value: string | Date | null | undefined) => formatJalaliDateTime(value, lang),
    [lang],
  );

  const translateCategory = useCallback(
    (name: string) => {
      if (lang === "fa") return name;
      const trimmed = name.trim();
      const found = COMMON_CATEGORY_TRANSLATIONS[trimmed];
      if (found) {
        return lang === "en" ? found.en : found.ar;
      }
      return lang === "en" ? toEnglishDigits(name) : name;
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir: LANGUAGE_META[lang].dir,
      locale: LANGUAGE_META[lang].locale,
      setLang,
      t,
      pick,
      formatNumber,
      formatMoney,
      formatDate,
      formatDateTime,
      translateCategory,
    }),
    [
      lang,
      setLang,
      t,
      pick,
      formatNumber,
      formatMoney,
      formatDate,
      formatDateTime,
      translateCategory,
    ],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "fa",
      dir: "rtl",
      locale: "fa-IR",
      setLang: () => undefined,
      t: (fa) => fa,
      pick: (obj) => obj.fa,
      formatNumber: (v) => Math.round(v || 0).toLocaleString("fa-IR"),
      formatMoney: (v, c) => `${Math.round(v || 0).toLocaleString("fa-IR")} ${c ?? "ریال"}`,
      formatDate: (v) => formatJalaliDate(v, "fa"),
      formatDateTime: (v) => formatJalaliDateTime(v, "fa"),
      translateCategory: (n) => n,
    };
  }
  return ctx;
}
