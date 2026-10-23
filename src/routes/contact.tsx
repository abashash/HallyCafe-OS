import { createFileRoute } from "@tanstack/react-router";
import { Clock3, ExternalLink, Instagram, Mail, MapPin, Phone, Smartphone } from "lucide-react";

import { PublicSiteLayout } from "@/components/PublicSiteLayout";
import { useI18n } from "@/lib/i18n";
import { isSafePublicUrl, usePublicSiteSettings } from "@/lib/public-site";

type ContactRow = {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
};

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تماس با ما | کافه هالی" },
      { name: "description", content: "راه‌های تماس، ساعات کاری و مسیریابی کافه هالی." },
      { property: "og:title", content: "تماس با ما | کافه هالی" },
      { property: "og:description", content: "راه‌های تماس، ساعات کاری و مسیریابی کافه هالی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  const { data: settings, isLoading, isError } = usePublicSiteSettings();
  const openPageText = t("مشاهده صفحه", "Open Page", "عرض الصفحة");

  const rows: ContactRow[] = [
    settings?.phone
      ? {
          icon: Phone,
          label: t("تلفن", "Phone", "الهاتف"),
          value: settings.phone,
          href: `tel:${settings.phone}`,
        }
      : null,
    settings?.mobile
      ? {
          icon: Smartphone,
          label: t("موبایل", "Mobile", "الجوال"),
          value: settings.mobile,
          href: `tel:${settings.mobile}`,
        }
      : null,
    settings?.email
      ? {
          icon: Mail,
          label: t("ایمیل", "Email", "البريد الإلكتروني"),
          value: settings.email,
          href: `mailto:${settings.email}`,
        }
      : null,
    settings?.address
      ? { icon: MapPin, label: t("نشانی", "Address", "العنوان"), value: settings.address }
      : null,
    settings?.opening_hours
      ? {
          icon: Clock3,
          label: t("ساعات کاری", "Opening Hours", "ساعات العمل"),
          value: settings.opening_hours,
        }
      : null,
    settings?.instagram_url && isSafePublicUrl(settings.instagram_url)
      ? {
          icon: Instagram,
          label: t("اینستاگرام", "Instagram", "إنستغرام"),
          value: openPageText,
          href: settings.instagram_url,
        }
      : null,
    ...[
      [t("تلگرام", "Telegram", "تيليجرام"), settings?.telegram_url],
      [t("واتساپ", "WhatsApp", "واتساب"), settings?.whatsapp_url],
      [t("یوتیوب", "YouTube", "يوتيوب"), settings?.youtube_url],
      [t("فیسبوک", "Facebook", "فيسبوك"), settings?.facebook_url],
      [t("ایکس", "X", "إكس"), settings?.x_url],
      [t("لینکدین", "LinkedIn", "لينكد إن"), settings?.linkedin_url],
    ].map(([label, href]) =>
      href && isSafePublicUrl(href)
        ? { icon: ExternalLink, label: label ?? "", value: openPageText, href }
        : null,
    ),
  ].filter((row): row is ContactRow => Boolean(row));

  const directions = [
    [t("گوگل مپ", "Google Maps", "خرائط جوجل"), settings?.google_maps_url],
    [t("ویز", "Waze", "ويز"), settings?.waze_url],
    [t("نشان", "Neshan", "نشان"), settings?.neshan_url],
    [t("بلد", "Balad", "بلد"), settings?.balad_url],
    [t("نقشه", "Map", "الخريطة"), settings?.map_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1] && isSafePublicUrl(entry[1])));

  return (
    <PublicSiteLayout>
      <main className="mx-auto min-h-[70svh] max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <h1 className="text-3xl font-black sm:text-5xl">
          {t("تماس با ما", "Contact Us", "اتصل بنا")}
        </h1>
        {isLoading ? (
          <div className="mt-8 h-64 animate-pulse rounded-md bg-public-surface" />
        ) : isError ? (
          <p className="mt-10 text-public-muted">
            {t(
              "نمایش اطلاعات تماس در حال حاضر ممکن نیست.",
              "Unable to load contact details right now.",
              "تعذر عرض معلومات الاتصال حالياً.",
            )}
          </p>
        ) : rows.length ? (
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-public-line bg-public-line sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="bg-public-surface p-5">
                <Icon className="size-5 text-public-accent" />
                <p className="mt-4 text-xs text-public-muted">{label}</p>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="mt-1 block font-bold"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="mt-1 whitespace-pre-line font-bold">{value}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-public-muted">
            {t(
              "اطلاعات تماس هنوز ثبت نشده است.",
              "Contact information has not been configured yet.",
              "لم تتم إضافة معلومات الاتصال بعد.",
            )}
          </p>
        )}
        {directions.length ? (
          <div className="mt-8">
            <h2 className="text-xl font-black">
              {t("مسیریابی روی نقشه", "Map & Directions", "الملاحة والاتجاهات")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {directions.map(([label, href]) => (
                <a
                  key={label}
                  className="inline-flex items-center gap-2 rounded-md border border-public-line bg-public-surface px-4 py-3 font-bold text-public-accent"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="size-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </PublicSiteLayout>
  );
}
