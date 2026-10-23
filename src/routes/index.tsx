import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarCheck, Coffee, Star } from "lucide-react";

import { PublicSiteLayout } from "@/components/PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/lib/hally-os";
import { useI18n } from "@/lib/i18n";
import { isSafePublicUrl, useBrandingImage, usePublicSiteSettings } from "@/lib/public-site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "کافه هالی | صفحه اول" },
      {
        name: "description",
        content: "صفحه رسمی کافه هالی، سفارش آنلاین، رزرو میز و باشگاه مشتریان.",
      },
      { property: "og:title", content: "کافه هالی | صفحه اول" },
      {
        property: "og:description",
        content: "صفحه رسمی کافه هالی، سفارش آنلاین، رزرو میز و باشگاه مشتریان.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { dir, t } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const { data: settings, isLoading } = usePublicSiteSettings();
  const { data: coverSrc } = useBrandingImage(settings?.cover_image_url);
  const name = settings?.cafe_name?.trim() || t("کافه هالی", "Hally Cafe", "مقهى هالي");
  const title = settings?.home_title?.trim() || name;
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <PublicSiteLayout>
      <main>
        <section className="relative grid min-h-[calc(100svh-4rem)] place-items-center overflow-hidden px-4 py-16 sm:min-h-[78svh] sm:px-6">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
          {coverSrc ? <div className="absolute inset-0 bg-public-primary/80" /> : null}
          <div className="relative mx-auto w-full max-w-4xl text-center">
            {isLoading ? (
              <div className="mx-auto h-32 max-w-xl animate-pulse rounded-md bg-public-overlay" />
            ) : (
              <>
                <Coffee className="mx-auto mb-6 size-12 text-public-accent" />
                <h1 className="text-4xl font-black leading-tight sm:text-6xl">{title}</h1>
                {settings?.home_summary ? (
                  <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-base leading-8 text-public-muted sm:text-lg">
                    {settings.home_summary}
                  </p>
                ) : null}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {isEnabled("online_menu") && (
                    <Button
                      asChild
                      size="lg"
                      className="bg-public-accent text-public-accent-foreground hover:bg-public-accent/90"
                    >
                      <Link to="/online-menu">
                        {t(
                          "مشاهده منو و سفارش آنلاین",
                          "View Menu & Order Online",
                          "عرض القائمة والطلب",
                        )}
                        <ArrowIcon className="size-4" />
                      </Link>
                    </Button>
                  )}
                  {isEnabled("online_menu") &&
                    isEnabled("public_reservation") &&
                    isEnabled("reservations") && (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-public-line bg-public-overlay text-public-foreground hover:bg-public-surface hover:text-public-foreground"
                      >
                        <Link to="/online-menu">
                          <CalendarCheck className="size-4 text-public-accent" />
                          {t("رزرو آنلاین میز", "Reserve a Table", "حجز طاولة")}
                        </Link>
                      </Button>
                    )}
                  {isEnabled("online_menu") &&
                    isEnabled("public_loyalty") &&
                    isEnabled("customers") && (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-public-line bg-public-overlay text-public-foreground hover:bg-public-surface hover:text-public-foreground"
                      >
                        <Link to="/online-menu">
                          <Star className="size-4 text-public-accent" />
                          {t("باشگاه مشتریان وفادار", "Customer Loyalty Club", "نادي ولاء العملاء")}
                        </Link>
                      </Button>
                    )}
                  {settings?.custom_links
                    .filter((link) => isSafePublicUrl(link.url))
                    .map((link) => (
                      <Button
                        key={`${link.label}-${link.url}`}
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-public-line bg-public-overlay text-public-foreground hover:bg-public-surface hover:text-public-foreground"
                      >
                        <a
                          href={link.url}
                          target={link.url.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                        >
                          {link.label}
                        </a>
                      </Button>
                    ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
