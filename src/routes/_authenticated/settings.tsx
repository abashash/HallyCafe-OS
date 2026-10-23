import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Globe,
  ImageUp,
  Plug,
  Plus,
  Save,
  Sliders,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { WordPressPluginExport } from "@/components/WordPressPluginExport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_HALLY_CONFIG,
  FEATURE_CATEGORIES,
  FEATURE_DEFINITIONS,
  type FeatureCategory,
  type FeatureKey,
  type HallySystemConfig,
} from "@/lib/feature-flags";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import { type AppLanguage, LANGUAGE_META, useI18n } from "@/lib/i18n";
import {
  DEFAULT_SITE_COLORS,
  type PublicSiteSettings,
  type SiteLink,
  usePublicSiteSettings,
} from "@/lib/public-site";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات و مدیریت امکانات | کافه هالی" },
      {
        name: "description",
        content:
          "مدیریت و فعال/غیرفعال‌سازی تمامی امکانات برنامه، زبان‌ها، مالیات، وفاداری و برندینگ.",
      },
    ],
  }),
  component: SettingsPage,
});

type FormState = Omit<PublicSiteSettings, "id">;

const EMPTY: FormState = {
  cafe_name: "",
  logo_url: null,
  cover_image_url: null,
  primary_color: DEFAULT_SITE_COLORS.primary,
  surface_color: DEFAULT_SITE_COLORS.surface,
  accent_color: DEFAULT_SITE_COLORS.accent,
  home_title: "",
  home_summary: "",
  about_title: "",
  about_body: "",
  phone: "",
  mobile: "",
  email: "",
  address: "",
  opening_hours: "",
  map_url: "",
  instagram_url: "",
  telegram_url: "",
  whatsapp_url: "",
  youtube_url: "",
  facebook_url: "",
  x_url: "",
  linkedin_url: "",
  google_maps_url: "",
  waze_url: "",
  neshan_url: "",
  balad_url: "",
  custom_links: [],
};

const CATEGORY_ORDER: FeatureCategory[] = [
  "public_site",
  "operations",
  "products_pricing",
  "customers_loyalty",
  "finance_system",
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { t, pick, dir } = useI18n();
  const { data, isLoading, isError } = usePublicSiteSettings();
  const { data: hallyBundle, isLoading: loadingHally } = useHallyBundle();
  const hallyMutation = useHallyMutation();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [sysConfig, setSysConfig] = useState<HallySystemConfig>(DEFAULT_HALLY_CONFIG);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) return tab;
    }
    return "features";
  });

  useEffect(() => {
    if (!data) return;
    const { id: _id, ...rest } = data;
    setForm(rest);
  }, [data]);

  useEffect(() => {
    if (hallyBundle?.config) {
      setSysConfig(hallyBundle.config);
    }
  }, [hallyBundle?.config]);

  const saveAll = useMutation({
    mutationFn: async () => {
      // 1. Save Hally OS system config & feature toggles
      await hallyMutation.mutateAsync({
        type: "save_config",
        config: sysConfig,
      });

      // 2. Save Public Site Settings to Supabase
      const payload = {
        ...form,
        singleton: true,
        custom_links: form.custom_links.filter((link) => link.label.trim() && link.url.trim()),
      };
      const result = data
        ? await supabase.from("public_site_settings").update(payload).eq("id", data.id)
        : await supabase.from("public_site_settings").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["public-site-settings"] });
      toast.success(
        t(
          "تمامی تنظیمات و وضعیت امکانات با موفقیت ذخیره شد",
          "All settings and feature flags saved successfully",
          "تم حفظ جميع الإعدادات وحالة الميزات بنجاح",
        ),
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function toggleFeatureImmediate(key: FeatureKey, enabled: boolean) {
    const nextConfig: HallySystemConfig = {
      ...sysConfig,
      features: {
        ...sysConfig.features,
        [key]: enabled,
      },
    };
    setSysConfig(nextConfig);
    try {
      await hallyMutation.mutateAsync({
        type: "save_config",
        config: nextConfig,
      });
      const def = FEATURE_DEFINITIONS.find((d) => d.key === key);
      const label = def ? pick(def.title) : key;
      toast.success(
        enabled
          ? t(`«${label}» فعال شد`, `"${label}" enabled`, `تم تفعيل «${label}»`)
          : t(`«${label}» غیرفعال شد`, `"${label}" disabled`, `تم تعطيل «${label}»`),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function setAllFeatures(enabled: boolean) {
    const nextFeatures = { ...sysConfig.features };
    for (const def of FEATURE_DEFINITIONS) {
      nextFeatures[def.key] = enabled;
    }
    const nextConfig: HallySystemConfig = {
      ...sysConfig,
      features: nextFeatures,
    };
    setSysConfig(nextConfig);
    try {
      await hallyMutation.mutateAsync({
        type: "save_config",
        config: nextConfig,
      });
      toast.success(
        enabled
          ? t("تمامی امکانات فعال شدند", "All features enabled", "تم تفعيل جميع الميزات")
          : t("تمامی امکانات غیرفعال شدند", "All features disabled", "تم تعطيل جميع الميزات"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function toggleEnabledLanguage(langCode: AppLanguage) {
    setSysConfig((prev) => {
      const exists = prev.enabled_languages.includes(langCode);
      if (exists && prev.enabled_languages.length <= 1) {
        toast.error(
          t(
            "حداقل یک زبان باید فعال باشد",
            "At least one language must remain enabled",
            "يجب أن تظل لغة واحدة على الأقل مفعلة",
          ),
        );
        return prev;
      }
      const nextLangs = exists
        ? prev.enabled_languages.filter((l) => l !== langCode)
        : [...prev.enabled_languages, langCode];
      const nextDefault = nextLangs.includes(prev.default_language)
        ? prev.default_language
        : (nextLangs[0] ?? "fa");
      return {
        ...prev,
        enabled_languages: nextLangs,
        default_language: nextDefault,
      };
    });
  }

  async function uploadImage(kind: "logo_url" | "cover_image_url", file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(
        t("فقط فایل تصویری انتخاب کنید", "Please select an image file", "الرجاء اختيار ملف صورة"),
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        t(
          "حجم تصویر نباید بیشتر از ۵ مگابایت باشد",
          "Image size must not exceed 5 MB",
          "يجب ألا يتجاوز حجم الصورة 5 ميجابايت",
        ),
      );
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${kind === "logo_url" ? "logos" : "covers"}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("public-branding")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm((current) => ({ ...current, [kind]: path }));
    toast.success(
      t(
        "تصویر آماده است؛ برای ثبت نهایی ذخیره را بزنید",
        "Image uploaded; click Save Changes to apply",
        "تم رفع الصورة؛ اضغط حفظ لتطبيق التغييرات",
      ),
    );
  }

  const field = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateLink = (index: number, key: keyof SiteLink, value: string) =>
    setForm((current) => ({
      ...current,
      custom_links: current.custom_links.map((link, i) =>
        i === index ? { ...link, [key]: value } : link,
      ),
    }));

  if (isLoading || loadingHally) {
    return <div className="h-72 animate-pulse rounded-md bg-muted" />;
  }
  if (isError) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        {t(
          "دریافت تنظیمات سایت ممکن نشد.",
          "Failed to load site settings.",
          "تعذر تحميل الإعدادات.",
        )}
      </p>
    );
  }

  const enabledCount = FEATURE_DEFINITIONS.filter(
    (d) => sysConfig.features[d.key] !== false,
  ).length;

  return (
    <>
      <PageHeader
        title={t(
          "تنظیمات و مدیریت امکانات",
          "Settings & Feature Management",
          "الإعدادات وإدارة الميزات",
        )}
        description={t(
          "تمامی امکانات برنامه، زبان‌ها، قوانین عملیاتی و محتوای عمومی را از این بخش مدیریت کنید.",
          "Enable or disable any module, configure languages, operational rules, and public site branding.",
          "تفعيل أو تعطيل جميع ميزات البرنامج وإعداد اللغات والقواعد التشغيلية والموقع العام.",
        )}
        actions={
          <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
            <Save className="size-4" />
            {t("ذخیره تغییرات", "Save All Changes", "حفظ جميع التغييرات")}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir}>
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="features" className="gap-1.5">
            <ToggleRight className="size-4" />
            {t(
              "مدیریت امکانات (فعال/غیرفعال)",
              "Features & Modules",
              "إدارة الميزات (تفعيل/تعطيل)",
            )}
            <Badge variant="secondary" className="ms-1 text-[11px]">
              {enabledCount}/{FEATURE_DEFINITIONS.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="wordpress"
            className="gap-1.5 font-bold border-primary/30 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Plug className="size-4" />
            {t("افزونه وردپرس (WordPress)", "WordPress Plugin", "إضافة ووردبريس")}
            <Badge
              variant="outline"
              className="ms-1 border-primary/40 bg-primary/10 text-[10px] text-primary data-[state=active]:bg-white data-[state=active]:text-primary"
            >
              ZIP
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-1.5">
            <Sliders className="size-4" />
            {t(
              "زبان، مالیات و قوانین هالی",
              "Languages, Tax & Hally Rules",
              "اللغات والضرائب وقواعد هالي",
            )}
          </TabsTrigger>
          <TabsTrigger value="brand">
            {t("برند و رنگ", "Brand & Colors", "العلامة والألوان")}
          </TabsTrigger>
          <TabsTrigger value="pages">
            {t("صفحات عمومی", "Public Pages", "الصفحات العامة")}
          </TabsTrigger>
          <TabsTrigger value="contact">
            {t("اطلاعات تماس", "Contact & Maps", "الاتصال والخرائط")}
          </TabsTrigger>
          <TabsTrigger value="links">
            {t("دکمه‌های صفحه اول", "Home Buttons", "أزرار الرئيسية")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-primary" />
                  {t(
                    "کنترل کامل ماژول‌ها و امکانات برنامه",
                    "Master Feature & Module Toggles",
                    "التحكم الكامل في وحدات وميزات البرنامج",
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t(
                    "با تغییر وضعیت هر کلید، آن امکان بلافاصله در منوی ناوبری، پنل مدیریت و وب‌سایت عمومی فعال یا غیرفعال می‌شود.",
                    "Toggling any switch immediately enables or disables that feature across navigation, admin, and public pages.",
                    "عند تغيير أي مفتاح، يتم تفعيل أو تعطيل الميزة فوراً في القائمة ولوحة الإدارة والموقع العام.",
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setAllFeatures(true)}>
                  {t("فعال کردن همه", "Enable All", "تفعيل الكل")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllFeatures(false)}>
                  {t("غیرفعال کردن همه", "Disable All", "تعطيل الكل")}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {CATEGORY_ORDER.map((catKey) => {
            const items = FEATURE_DEFINITIONS.filter((d) => d.category === catKey);
            return (
              <Card key={catKey}>
                <CardHeader>
                  <CardTitle className="text-base">{pick(FEATURE_CATEGORIES[catKey])}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {items.map((item) => {
                    const checked = sysConfig.features[item.key] !== false;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all ${
                          checked
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border bg-muted/30 opacity-80"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{pick(item.title)}</p>
                            <button
                              type="button"
                              onClick={() => void toggleFeatureImmediate(item.key, !checked)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                                checked
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  checked ? "bg-white" : "bg-zinc-500"
                                }`}
                              />
                              {checked
                                ? t("فعال", "Active", "مفعل")
                                : t("غیرفعال", "Inactive", "معطل")}
                            </button>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {pick(item.description)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pt-1">
                          <Switch
                            checked={checked}
                            onCheckedChange={(val) => void toggleFeatureImmediate(item.key, val)}
                            aria-label={pick(item.title)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                {t(
                  "تنظیمات سه‌زبانه و واحد پول",
                  "Languages & Currency Settings",
                  "إعدادات اللغات والعملة",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t(
                  "زبان‌های فعال در برنامه",
                  "Enabled Languages",
                  "اللغات المفعلة في البرنامج",
                )}
              >
                <div className="flex flex-wrap gap-3 pt-1">
                  {(["fa", "en", "ar"] as AppLanguage[]).map((code) => {
                    const active = sysConfig.enabled_languages.includes(code);
                    return (
                      <Button
                        key={code}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleEnabledLanguage(code)}
                      >
                        {LANGUAGE_META[code].nativeLabel} ({code.toUpperCase()})
                      </Button>
                    );
                  })}
                </div>
              </Field>

              <Field label={t("زبان پیش‌فرض", "Default Language", "اللغة الافتراضية")}>
                <Select
                  value={sysConfig.default_language}
                  onValueChange={(v) =>
                    setSysConfig((c) => ({ ...c, default_language: v as AppLanguage }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fa">فارسی (FA)</SelectItem>
                    <SelectItem value="en">English (EN)</SelectItem>
                    <SelectItem value="ar">العربية (AR)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("نماد ارز نمایشی", "Currency Symbol", "رمز العملة")}>
                <Input
                  value={sysConfig.currency_symbol}
                  onChange={(e) => setSysConfig((c) => ({ ...c, currency_symbol: e.target.value }))}
                  placeholder="ریال / تومان"
                />
              </Field>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "قوانین قیمت‌گذاری و بهای تمام‌شده",
                    "Costing & Pricing Engine",
                    "قواعد التسعير والتكلفة",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field
                  label={t(
                    "گرد کردن قیمت‌های پیشنهادی به",
                    "Round Suggested Prices To",
                    "تقريب الأسعار المقترحة إلى",
                  )}
                >
                  <Input
                    type="number"
                    dir="ltr"
                    value={sysConfig.round_prices_to}
                    onChange={(e) =>
                      setSysConfig((c) => ({
                        ...c,
                        round_prices_to: Number(e.target.value) || 1000,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={t(
                    "حداکثر درصد مجاز بهای تمام‌شده (Food Cost %)",
                    "Max Allowed Food Cost (%)",
                    "الحد الأقصى لنسبة تكلفة الطعام (%)",
                  )}
                >
                  <Input
                    type="number"
                    dir="ltr"
                    value={sysConfig.max_food_cost_pct}
                    onChange={(e) =>
                      setSysConfig((c) => ({
                        ...c,
                        max_food_cost_pct: Number(e.target.value) || 35,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={t(
                    "حاشیه سود هدف پیش‌فرض (٪)",
                    "Default Target Margin (%)",
                    "هامش الربح المستهدف الافتراضي (%)",
                  )}
                >
                  <Input
                    type="number"
                    dir="ltr"
                    value={sysConfig.default_margin_value}
                    onChange={(e) =>
                      setSysConfig((c) => ({
                        ...c,
                        default_margin_value: Number(e.target.value) || 60,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={t(
                    "آستانه هشدار تغییر قیمت مواد اولیه (٪)",
                    "Price Spike Alert Threshold (%)",
                    "عتبة تنبيه تغير أسعار المواد (%)",
                  )}
                >
                  <Input
                    type="number"
                    dir="ltr"
                    value={sysConfig.price_change_threshold_pct}
                    onChange={(e) =>
                      setSysConfig((c) => ({
                        ...c,
                        price_change_threshold_pct: Number(e.target.value) || 5,
                      }))
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "مالیات، باشگاه مشتریان و درگاه پرداخت",
                    "Tax, Loyalty & Payment Gateways",
                    "الضرائب والولاء وبوابات الدفع",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>
                    {t(
                      "محاسبه مالیات بر ارزش افزوده",
                      "Enable VAT / Tax",
                      "تفعيل ضريبة القيمة المضافة",
                    )}
                  </Label>
                  <Switch
                    checked={sysConfig.tax_enabled}
                    onCheckedChange={(v) => setSysConfig((c) => ({ ...c, tax_enabled: v }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("نرخ مالیات (٪)", "Tax Rate (%)", "نسبة الضريبة (%)")}>
                    <Input
                      type="number"
                      dir="ltr"
                      value={sysConfig.tax_rate}
                      onChange={(e) =>
                        setSysConfig((c) => ({ ...c, tax_rate: Number(e.target.value) || 0 }))
                      }
                    />
                  </Field>
                  <Field
                    label={t(
                      "امتیاز به ازای هر ۱۰۰,۰۰۰ ریال",
                      "Points per 100,000 IRR",
                      "النقاط لكل 100,000",
                    )}
                  >
                    <Input
                      type="number"
                      dir="ltr"
                      value={sysConfig.loyalty_points_per_1000}
                      onChange={(e) =>
                        setSysConfig((c) => ({
                          ...c,
                          loyalty_points_per_1000: Number(e.target.value) || 1,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field
                  label={t(
                    "مرچنت کد زرین‌پال (اختیاری)",
                    "Zarinpal Merchant ID",
                    "معرف تاجر زرين بال",
                  )}
                >
                  <Input
                    dir="ltr"
                    value={sysConfig.zarinpal_merchant_id}
                    onChange={(e) =>
                      setSysConfig((c) => ({ ...c, zarinpal_merchant_id: e.target.value }))
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </Field>
                <Field
                  label={t("مرچنت کد زیبال (اختیاری)", "Zibal Merchant ID", "معرف تاجر زيبال")}
                >
                  <Input
                    dir="ltr"
                    value={sysConfig.zibal_merchant_id}
                    onChange={(e) =>
                      setSysConfig((c) => ({ ...c, zibal_merchant_id: e.target.value }))
                    }
                    placeholder="zibal"
                  />
                </Field>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "درگاه پیامک و کد یکبارمصرف مشتریان (مدیانا / ملی پیامک)",
                  "Customer Mobile OTP SMS Gateways (Mediana & MeliPayamak)",
                  "بوابات الرسائل النصية ورمز التحقق للعملاء (مديانا / ملي پیامک)",
                )}
              </CardTitle>
              <CardDescription>
                {t(
                  "تنظیمات ورود مشتریان با شماره موبایل و کد یکبارمصرف (OTP) برای مشاهده حساب کاربری و فاکتورهای سابق.",
                  "Configure Mediana (IPPanel) and MeliPayamak SMS gateways for customer mobile OTP login and invoice history access.",
                  "إعدادات تسجيل دخول العملاء برقم الجوال ورمز التحقق لعرض الحساب والفواتير السابقة.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t(
                    "درگاه پیامک پیش‌فرض سیستم",
                    "Default SMS OTP Provider",
                    "بوابة الرسائل الافتراضية",
                  )}
                >
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant={sysConfig.sms_provider === "mediana" ? "default" : "outline"}
                      onClick={() => setSysConfig((c) => ({ ...c, sms_provider: "mediana" }))}
                      className={
                        sysConfig.sms_provider === "mediana"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : ""
                      }
                    >
                      {t("مدیانا (Mediana)", "Mediana", "مديانا")}
                    </Button>
                    <Button
                      type="button"
                      variant={sysConfig.sms_provider === "melipayamak" ? "default" : "outline"}
                      onClick={() => setSysConfig((c) => ({ ...c, sms_provider: "melipayamak" }))}
                      className={
                        sysConfig.sms_provider === "melipayamak"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : ""
                      }
                    >
                      {t("ملی پیامک (MeliPayamak)", "MeliPayamak", "ملي پیامک")}
                    </Button>
                  </div>
                </Field>

                <div className="flex items-center justify-between rounded-xl border p-3.5">
                  <div className="space-y-0.5">
                    <Label>
                      {t(
                        "حالت آزمایشی / نمایش کد در صفحه ورود",
                        "Sandbox / Show OTP Preview in UI",
                        "الوضع التجريبي / إظهار رمز التحقق",
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "در صورت فعال بودن، کد یکبارمصرف علاوه بر ارسال پیامک در کادر ورود نیز نمایش داده می‌شود.",
                        "When enabled, the generated OTP code is also shown on screen for testing.",
                        "عند التفعيل، يظهر رمز التحقق على الشاشة للاختبار السريع.",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={sysConfig.sms_sandbox_mode}
                    onCheckedChange={(v) => setSysConfig((c) => ({ ...c, sms_sandbox_mode: v }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">
                      {t(
                        "تنظیمات وب‌سرویس مدیانا (Mediana / IPPanel)",
                        "Mediana (IPPanel) Configuration",
                        "إعدادات بوابة مديانا",
                      )}
                    </h4>
                    <Badge variant={sysConfig.sms_provider === "mediana" ? "default" : "outline"}>
                      {sysConfig.sms_provider === "mediana"
                        ? t("درگاه فعال", "Active", "نشط")
                        : t("آماده", "Standby", "احتياطي")}
                    </Badge>
                  </div>
                  <Field label={t("کلید دسترسی (API Key)", "Mediana API Key", "مفتاح API")}>
                    <Input
                      dir="ltr"
                      value={sysConfig.mediana_api_key}
                      onChange={(e) =>
                        setSysConfig((c) => ({ ...c, mediana_api_key: e.target.value }))
                      }
                      placeholder="OWY4M2I0..."
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("کد فرستنده (شماره اختصاصی)", "Sender Line", "رقم المرسل")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.mediana_sender_number}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, mediana_sender_number: e.target.value }))
                        }
                        placeholder="3000505"
                      />
                    </Field>
                    <Field label={t("کد پترن ورود و OTP", "Login OTP Pattern", "كود نمط الدخول")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.mediana_pattern_code}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, mediana_pattern_code: e.target.value }))
                        }
                        placeholder="hally-otp-verify"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field
                      label={t("کد پترن تأیید رزرو میز", "Reservation Pattern", "كود نمط الحجز")}
                    >
                      <Input
                        dir="ltr"
                        value={sysConfig.mediana_pattern_reservation}
                        onChange={(e) =>
                          setSysConfig((c) => ({
                            ...c,
                            mediana_pattern_reservation: e.target.value,
                          }))
                        }
                        placeholder="hally-res-confirm"
                      />
                    </Field>
                    <Field label={t("کد پترن ثبت و وضعیت سفارش", "Order Pattern", "كود نمط الطلب")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.mediana_pattern_order}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, mediana_pattern_order: e.target.value }))
                        }
                        placeholder="hally-order-alert"
                      />
                    </Field>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">
                      {t(
                        "تنظیمات وب‌سرویس ملی پیامک (MeliPayamak)",
                        "MeliPayamak Configuration",
                        "إعدادات بوابة ملي پیامک",
                      )}
                    </h4>
                    <Badge
                      variant={sysConfig.sms_provider === "melipayamak" ? "default" : "outline"}
                    >
                      {sysConfig.sms_provider === "melipayamak"
                        ? t("درگاه فعال", "Active", "نشط")
                        : t("آماده", "Standby", "احتياطي")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("نام کاربری پنل", "Username", "اسم المستخدم")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.melipayamak_username}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, melipayamak_username: e.target.value }))
                        }
                        placeholder="0912..."
                      />
                    </Field>
                    <Field label={t("رمز عبور / توکن", "Password / Token", "كلمة المرور")}>
                      <Input
                        type="password"
                        dir="ltr"
                        value={sysConfig.melipayamak_password}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, melipayamak_password: e.target.value }))
                        }
                        placeholder="••••••••"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("شماره خط اختصاصی", "Sender Line", "رقم الخط")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.melipayamak_sender_number}
                        onChange={(e) =>
                          setSysConfig((c) => ({
                            ...c,
                            melipayamak_sender_number: e.target.value,
                          }))
                        }
                        placeholder="50004001"
                      />
                    </Field>
                    <Field label={t("کد متن ورود و OTP (BodyId)", "OTP BodyId", "معرف نمط الدخول")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.melipayamak_body_id}
                        onChange={(e) =>
                          setSysConfig((c) => ({ ...c, melipayamak_body_id: e.target.value }))
                        }
                        placeholder="148290"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field
                      label={t(
                        "کد متن تأیید رزرو (BodyId)",
                        "Reservation BodyId",
                        "معرف نمط الحجز",
                      )}
                    >
                      <Input
                        dir="ltr"
                        value={sysConfig.melipayamak_body_id_reservation}
                        onChange={(e) =>
                          setSysConfig((c) => ({
                            ...c,
                            melipayamak_body_id_reservation: e.target.value,
                          }))
                        }
                        placeholder="148291"
                      />
                    </Field>
                    <Field label={t("کد متن ثبت سفارش (BodyId)", "Order BodyId", "معرف نمط الطلب")}>
                      <Input
                        dir="ltr"
                        value={sysConfig.melipayamak_body_id_order}
                        onChange={(e) =>
                          setSysConfig((c) => ({
                            ...c,
                            melipayamak_body_id_order: e.target.value,
                          }))
                        }
                        placeholder="148292"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-muted-foreground/20 bg-muted/40 p-4 text-xs leading-6">
                <p className="font-bold text-foreground">
                  {t(
                    "راهنمای متغیرهای الگو (Pattern Variables) در سامانه‌های پیامکی:",
                    "SMS Pattern Variables Guide:",
                    "دليل متغيرات أنماط الرسائل القصيرة:",
                  )}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-background p-2">
                    <p className="font-semibold text-primary">کد یکبارمصرف (OTP):</p>
                    <p className="font-mono text-muted-foreground">code یا verification-code</p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="font-semibold text-primary">تأیید رزرو میز:</p>
                    <p className="font-mono text-muted-foreground">name, date, time, table</p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="font-semibold text-primary">سفارش و صورتحساب:</p>
                    <p className="font-mono text-muted-foreground">order, name, total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>{t("هویت بصری", "Visual Identity", "الهوية البصرية")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label={t("نام کافه", "Cafe Name", "اسم المقهى")}>
                <Input
                  value={form.cafe_name ?? ""}
                  onChange={(e) => field("cafe_name", e.target.value)}
                />
              </Field>
              <div />
              <UploadField
                label={t("لوگو", "Logo", "الشعار")}
                value={form.logo_url}
                onFile={(file) => uploadImage("logo_url", file)}
              />
              <UploadField
                label={t("تصویر صفحه اول", "Hero Cover Image", "صورة الصفحة الرئيسية")}
                value={form.cover_image_url}
                onFile={(file) => uploadImage("cover_image_url", file)}
              />
              <ColorField
                label={t("رنگ اصلی", "Primary Color", "اللون الأساسي")}
                value={form.primary_color ?? DEFAULT_SITE_COLORS.primary}
                onChange={(value) => field("primary_color", value)}
              />
              <ColorField
                label={t("رنگ کارت‌ها", "Surface Color", "لون البطاقات")}
                value={form.surface_color ?? DEFAULT_SITE_COLORS.surface}
                onChange={(value) => field("surface_color", value)}
              />
              <ColorField
                label={t("رنگ تأکیدی", "Accent Color", "اللون المميز")}
                value={form.accent_color ?? DEFAULT_SITE_COLORS.accent}
                onChange={(value) => field("accent_color", value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("صفحه اول و درباره ما", "Home & About Content", "محتوى الرئيسية ومن نحن")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Field label={t("عنوان صفحه اول", "Home Title", "عنوان الصفحة الرئيسية")}>
                <Input
                  value={form.home_title ?? ""}
                  onChange={(e) => field("home_title", e.target.value)}
                />
              </Field>
              <Field label={t("متن صفحه اول", "Home Summary", "ملخص الصفحة الرئيسية")}>
                <Textarea
                  rows={4}
                  value={form.home_summary ?? ""}
                  onChange={(e) => field("home_summary", e.target.value)}
                />
              </Field>
              <Field label={t("عنوان درباره ما", "About Title", "عنوان من نحن")}>
                <Input
                  value={form.about_title ?? ""}
                  onChange={(e) => field("about_title", e.target.value)}
                />
              </Field>
              <Field label={t("متن درباره ما", "About Body", "نص من نحن")}>
                <Textarea
                  rows={8}
                  value={form.about_body ?? ""}
                  onChange={(e) => field("about_body", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("اطلاعات تماس", "Contact Information", "معلومات الاتصال")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label={t("تلفن ثابت", "Phone", "الهاتف الثابت")}>
                <Input
                  dir="ltr"
                  value={form.phone ?? ""}
                  onChange={(e) => field("phone", e.target.value)}
                />
              </Field>
              <Field label={t("شماره موبایل", "Mobile", "رقم الجوال")}>
                <Input
                  dir="ltr"
                  inputMode="tel"
                  value={form.mobile ?? ""}
                  onChange={(e) => field("mobile", e.target.value)}
                />
              </Field>
              <Field label={t("ایمیل", "Email", "البريد الإلكتروني")}>
                <Input
                  dir="ltr"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => field("email", e.target.value)}
                />
              </Field>
              <Field label={t("نشانی", "Address", "العنوان")}>
                <Textarea
                  value={form.address ?? ""}
                  onChange={(e) => field("address", e.target.value)}
                />
              </Field>
              <Field label={t("ساعات کاری", "Opening Hours", "ساعات العمل")}>
                <Textarea
                  value={form.opening_hours ?? ""}
                  onChange={(e) => field("opening_hours", e.target.value)}
                />
              </Field>
              <Field label={t("پیوند عمومی نقشه", "Public Map URL", "رابط الخريطة العام")}>
                <Input
                  dir="ltr"
                  value={form.map_url ?? ""}
                  onChange={(e) => field("map_url", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("مسیریابی", "Map Navigation Links", "روابط الملاحة")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label={t("گوگل مپ", "Google Maps", "خرائط جوجل")}>
                <Input
                  dir="ltr"
                  value={form.google_maps_url ?? ""}
                  onChange={(e) => field("google_maps_url", e.target.value)}
                />
              </Field>
              <Field label={t("ویز", "Waze", "ويز")}>
                <Input
                  dir="ltr"
                  value={form.waze_url ?? ""}
                  onChange={(e) => field("waze_url", e.target.value)}
                />
              </Field>
              <Field label={t("نشان", "Neshan", "نشان")}>
                <Input
                  dir="ltr"
                  value={form.neshan_url ?? ""}
                  onChange={(e) => field("neshan_url", e.target.value)}
                />
              </Field>
              <Field label={t("بلد", "Balad", "بلد")}>
                <Input
                  dir="ltr"
                  value={form.balad_url ?? ""}
                  onChange={(e) => field("balad_url", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                {t("شبکه‌های اجتماعی", "Social Media", "وسائل التواصل الاجتماعي")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Instagram">
                <Input
                  dir="ltr"
                  value={form.instagram_url ?? ""}
                  onChange={(e) => field("instagram_url", e.target.value)}
                />
              </Field>
              <Field label="Telegram">
                <Input
                  dir="ltr"
                  value={form.telegram_url ?? ""}
                  onChange={(e) => field("telegram_url", e.target.value)}
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  dir="ltr"
                  value={form.whatsapp_url ?? ""}
                  onChange={(e) => field("whatsapp_url", e.target.value)}
                />
              </Field>
              <Field label="YouTube">
                <Input
                  dir="ltr"
                  value={form.youtube_url ?? ""}
                  onChange={(e) => field("youtube_url", e.target.value)}
                />
              </Field>
              <Field label="Facebook">
                <Input
                  dir="ltr"
                  value={form.facebook_url ?? ""}
                  onChange={(e) => field("facebook_url", e.target.value)}
                />
              </Field>
              <Field label="X (Twitter)">
                <Input
                  dir="ltr"
                  value={form.x_url ?? ""}
                  onChange={(e) => field("x_url", e.target.value)}
                />
              </Field>
              <Field label="LinkedIn">
                <Input
                  dir="ltr"
                  value={form.linkedin_url ?? ""}
                  onChange={(e) => field("linkedin_url", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {t("دکمه‌های صفحه اول", "Home Action Buttons", "أزرار الصفحة الرئيسية")}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    custom_links: [...current.custom_links, { label: "", url: "" }],
                  }))
                }
              >
                <Plus className="size-4" />
                {t("افزودن", "Add Button", "إضافة")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.custom_links.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t(
                    "دکمه‌ای اضافه نشده است.",
                    "No custom buttons added yet.",
                    "لم تتم إضافة أزرار بعد.",
                  )}
                </p>
              ) : (
                form.custom_links.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2"
                  >
                    <Input
                      placeholder={t("عنوان", "Label", "العنوان")}
                      value={link.label}
                      onChange={(e) => updateLink(index, "label", e.target.value)}
                    />
                    <Input
                      dir="ltr"
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          custom_links: current.custom_links.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wordpress" className="space-y-6">
          <WordPressPluginExport />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="p-1"
        />
        <Input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function UploadField({
  label,
  value,
  onFile,
}: {
  label: string;
  value: string | null;
  onFile: (file: File) => void;
}) {
  const { t } = useI18n();
  return (
    <Field label={label}>
      <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-4 text-sm">
        <ImageUp className="size-5" />
        <span>
          {value
            ? t("تعویض تصویر", "Replace Image", "تغيير الصورة")
            : t("انتخاب تصویر", "Select Image", "اختيار صورة")}
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) onFile(selected);
          }}
        />
      </label>
    </Field>
  );
}
