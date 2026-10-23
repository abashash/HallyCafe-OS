import { createFileRoute } from "@tanstack/react-router";

import { PublicSiteLayout } from "@/components/PublicSiteLayout";
import { useI18n } from "@/lib/i18n";
import { useBrandingImage, usePublicSiteSettings } from "@/lib/public-site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "درباره ما | کافه هالی" },
      { name: "description", content: "داستان و معرفی کافه هالی." },
      { property: "og:title", content: "درباره ما | کافه هالی" },
      { property: "og:description", content: "داستان و معرفی کافه هالی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();
  const { data: settings, isLoading, isError } = usePublicSiteSettings();
  const { data: coverSrc } = useBrandingImage(settings?.cover_image_url);
  return (
    <PublicSiteLayout>
      <main className="mx-auto min-h-[70svh] max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        {isLoading ? (
          <div className="h-72 animate-pulse rounded-md bg-public-surface" />
        ) : isError ? (
          <p className="py-20 text-center text-public-muted">
            {t(
              "نمایش اطلاعات در حال حاضر ممکن نیست.",
              "Unable to load information at this time.",
              "تعذر عرض المعلومات حالياً.",
            )}
          </p>
        ) : settings?.about_title || settings?.about_body ? (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)] md:items-center">
            <div>
              <h1 className="text-3xl font-black sm:text-5xl">
                {settings.about_title || t("درباره ما", "About Us", "من نحن")}
              </h1>
              {settings.about_body ? (
                <p className="mt-6 whitespace-pre-line text-base leading-8 text-public-muted">
                  {settings.about_body}
                </p>
              ) : null}
            </div>
            {coverSrc ? (
              <img src={coverSrc} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
            ) : null}
          </div>
        ) : (
          <p className="py-20 text-center text-public-muted">
            {t(
              "اطلاعات این صفحه هنوز ثبت نشده است.",
              "About content has not been added yet.",
              "لم تتم إضافة محتوى هذه الصفحة بعد.",
            )}
          </p>
        )}
      </main>
    </PublicSiteLayout>
  );
}
