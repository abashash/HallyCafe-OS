import { Link } from "@tanstack/react-router";
import {
  Coffee,
  Instagram,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { CustomerAccountDialog } from "@/components/CustomerAccountDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags, usePublicHally } from "@/lib/hally-os";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_SITE_COLORS,
  safeColor,
  useBrandingImage,
  usePublicSiteSettings,
} from "@/lib/public-site";

type PublicStyle = CSSProperties & {
  "--public-primary": string;
  "--public-surface": string;
  "--public-accent": string;
};

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  const { data: settings } = usePublicSiteSettings();
  const { data: logoSrc } = useBrandingImage(settings?.logo_url);
  const { data: publicHally } = usePublicHally();
  const { isEnabled } = useFeatureFlags();
  const { isAdmin } = useAuth();
  const { dir, t } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);

  const style: PublicStyle = {
    "--public-primary": safeColor(settings?.primary_color, DEFAULT_SITE_COLORS.primary),
    "--public-surface": safeColor(settings?.surface_color, DEFAULT_SITE_COLORS.surface),
    "--public-accent": safeColor(settings?.accent_color, DEFAULT_SITE_COLORS.accent),
  };
  const name = settings?.cafe_name?.trim() || t("کافه هالی", "Hally Cafe", "مقهى هالي");
  const showMenu = isEnabled("online_menu");
  const showLoyalty = isEnabled("public_loyalty") && isEnabled("customers");

  return (
    <div dir={dir} className="public-site min-h-screen" style={style}>
      <header className="public-header sticky top-0 z-40 border-b border-public-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label={t(`صفحه اول ${name}`, `${name} Home`, `الرئيسية ${name}`)}
          >
            {logoSrc ? (
              <img src={logoSrc} alt={name} className="size-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-public-accent text-public-accent-foreground">
                <Coffee className="size-5" />
              </span>
            )}
            <span className="truncate text-base font-black text-public-foreground sm:text-lg">
              {name}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav
              className="hidden items-center gap-1 sm:flex"
              aria-label={t("ناوبری عمومی", "Public navigation", "التنقل العام")}
            >
              <Button
                asChild
                variant="ghost"
                className="text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
              >
                <Link to="/">{t("صفحه اول", "Home", "الرئيسية")}</Link>
              </Button>
              {showMenu && (
                <Button
                  asChild
                  variant="ghost"
                  className="text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
                >
                  <Link to="/online-menu">{t("منوی آنلاین", "Online Menu", "القائمة")}</Link>
                </Button>
              )}
              <Button
                asChild
                variant="ghost"
                className="text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
              >
                <Link to="/about">{t("درباره ما", "About Us", "من نحن")}</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
              >
                <Link to="/contact">{t("تماس", "Contact", "اتصل بنا")}</Link>
              </Button>
            </nav>

            {showLoyalty && (
              <Button
                type="button"
                size="sm"
                onClick={() => setAccountOpen(true)}
                className="gap-1.5 bg-public-accent text-public-accent-foreground hover:bg-public-accent/90"
              >
                <UserCheck className="size-4" />
                <span className="hidden md:inline">
                  {t("ورود مهمان / فاکتورها", "Guest Account & Invoices", "حساب الضيف والفواتير")}
                </span>
                <span className="md:hidden">{t("حساب مهمان", "Guest", "الضيف")}</span>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 border-public-line text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
            >
              <Link to="/auth">
                <ShieldCheck className="size-4 text-public-accent" />
                <span className="hidden lg:inline">
                  {t("ورود پرسنل", "Staff Login", "دخول الموظفين")}
                </span>
              </Link>
            </Button>

            <LanguageSwitcher variant="public" />

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  className="bg-public-accent text-public-accent-foreground hover:bg-public-accent/90 sm:hidden"
                  aria-label={t("باز کردن فهرست صفحات", "Open menu", "فتح القائمة")}
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={dir === "rtl" ? "right" : "left"}
                dir={dir}
                className="border-public-line bg-public-surface text-public-foreground"
              >
                <SheetTitle className="text-start text-public-foreground">{name}</SheetTitle>
                <nav
                  className="mt-8 grid gap-2"
                  aria-label={t("فهرست صفحات موبایل", "Mobile navigation", "قائمة الجوال")}
                >
                  <MobileNavLink to="/">{t("صفحه اول", "Home", "الرئيسية")}</MobileNavLink>
                  {showMenu && (
                    <MobileNavLink to="/online-menu">
                      {t("منوی آنلاین", "Online Menu", "القائمة الإلكترونية")}
                    </MobileNavLink>
                  )}
                  <MobileNavLink to="/about">{t("درباره ما", "About Us", "من نحن")}</MobileNavLink>
                  <MobileNavLink to="/contact">
                    {t("تماس با ما", "Contact Us", "اتصل بنا")}
                  </MobileNavLink>
                  {showLoyalty && (
                    <Button
                      type="button"
                      onClick={() => setAccountOpen(true)}
                      className="mt-2 h-11 justify-start gap-2 bg-public-accent text-public-accent-foreground hover:bg-public-accent/90"
                    >
                      <UserCheck className="size-4" />
                      {t(
                        "ورود مهمان و فاکتورهای سابق",
                        "Guest Login & Past Invoices",
                        "دخول الضيف والفواتير السابقة",
                      )}
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="mt-1 h-11 justify-start gap-2 border-public-line text-public-foreground hover:bg-public-overlay"
                  >
                    <Link to="/auth">
                      <ShieldCheck className="size-4 text-public-accent" />
                      {t(
                        "ورود پرسنل و مدیریت کافه",
                        "Staff & Management Login",
                        "دخول الموظفين والإدارة",
                      )}
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <CustomerAccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        defaultProvider={publicHally?.config.sms_provider ?? "mediana"}
        {...(publicHally?.config.currency_symbol
          ? { currencySymbol: publicHally.config.currency_symbol }
          : {})}
      />

      {children}

      <footer className="border-t border-public-line bg-public-surface text-public-foreground">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-6">
          <div className="min-w-0">
            <p className="font-black">{name}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-public-muted">
              {settings?.phone ? (
                <a className="inline-flex items-center gap-2" href={`tel:${settings.phone}`}>
                  <Phone className="size-4" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              ) : null}
              {settings?.mobile ? (
                <a className="inline-flex items-center gap-2" href={`tel:${settings.mobile}`}>
                  <Smartphone className="size-4" />
                  <span dir="ltr">{settings.mobile}</span>
                </a>
              ) : null}
              {settings?.address ? (
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {settings.address}
                </span>
              ) : null}
              {settings?.instagram_url ? (
                <a
                  className="inline-flex items-center gap-2"
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="size-4" />
                  {t("اینستاگرام", "Instagram", "إنستغرام")}
                </a>
              ) : null}
            </div>
          </div>
          <nav
            className="flex items-center gap-4 text-sm text-public-muted"
            aria-label={t("پیوندهای پایین صفحه", "Footer links", "روابط التذييل")}
          >
            <Link to="/about">{t("درباره ما", "About", "من نحن")}</Link>
            <Link to="/contact">{t("تماس", "Contact", "اتصل بنا")}</Link>
            <Link to="/auth" className="hover:text-public-foreground">
              {t("ورود پرسنل", "Staff Login", "دخول الموظفين")}
            </Link>
            {isAdmin && (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-public-accent/20 px-2.5 py-1 font-semibold text-public-foreground hover:bg-public-accent/30"
              >
                <ShieldCheck className="size-3.5" />
                {t("پنل مدیریت", "Admin Panel", "لوحة الإدارة")}
              </Link>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MobileNavLink({
  to,
  children,
}: {
  to: "/" | "/online-menu" | "/about" | "/contact";
  children: ReactNode;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className="h-12 justify-start text-base text-public-foreground hover:bg-public-overlay hover:text-public-foreground"
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}
