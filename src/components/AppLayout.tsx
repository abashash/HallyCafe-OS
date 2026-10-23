import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Coffee,
  Package,
  Tags,
  Truck,
  ReceiptText,
  BookOpen,
  ShoppingCart,
  BellRing,
  BarChart3,
  ScrollText,
  Wallet,
  LogOut,
  Menu,
  Settings,
  Monitor,
  ClipboardList,
  CalendarCheck,
  Layers,
  QrCode,
  CalendarDays,
  BadgeDollarSign,
  Users,
  Star,
  TicketPercent,
  Gift,
  CreditCard,
  Printer,
  Plug,
  Store,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import type { FeatureKey } from "@/lib/feature-flags";
import { useFeatureFlags, useHallyBundle } from "@/lib/hally-os";
import { STAFF_ROLE_LABELS } from "@/lib/hally-types";
import { type TrilingualText, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: TrilingualText;
  icon: LucideIcon;
  feature?: FeatureKey;
};

type NavSection = {
  title: TrilingualText;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: {
      fa: "عملیات روزانه",
      en: "Operations",
      ar: "العمليات اليومية",
    },
    items: [
      {
        to: "/dashboard",
        label: { fa: "داشبورد", en: "Dashboard", ar: "لوحة التحكم" },
        icon: LayoutDashboard,
      },
      {
        to: "/pos",
        label: { fa: "صندوق و سفارش‌گیر (POS)", en: "POS & Waiter Tablet", ar: "نقطة البيع (POS)" },
        icon: Store,
        feature: "pos",
      },
      {
        to: "/kds",
        label: { fa: "نمایشگر آشپزخانه", en: "Kitchen Display (KDS)", ar: "شاشة المطبخ (KDS)" },
        icon: Monitor,
        feature: "kds",
      },
      {
        to: "/orders",
        label: { fa: "صف سفارش‌ها", en: "Live Orders", ar: "طابور الطلبات" },
        icon: ClipboardList,
        feature: "orders",
      },
      {
        to: "/tables",
        label: { fa: "میزها و QR", en: "Tables & QR", ar: "الطاولات و QR" },
        icon: QrCode,
        feature: "tables",
      },
      {
        to: "/reservations",
        label: { fa: "رزرو میز", en: "Reservations", ar: "حجز الطاولات" },
        icon: CalendarCheck,
        feature: "reservations",
      },
      {
        to: "/calendar",
        label: { fa: "تقویم عملیاتی", en: "Calendar", ar: "التقويم التشغيلي" },
        icon: CalendarDays,
        feature: "calendar",
      },
    ],
  },
  {
    title: {
      fa: "محصولات، انبار و قیمت",
      en: "Inventory & Pricing",
      ar: "المخزون والتسعير",
    },
    items: [
      {
        to: "/inventory",
        label: { fa: "دفتر کل انبار", en: "Inventory Ledger", ar: "سجل المخزون" },
        icon: Layers,
        feature: "inventory",
      },
      {
        to: "/ingredients",
        label: { fa: "مواد اولیه", en: "Raw Materials", ar: "المواد الأولية" },
        icon: Package,
        feature: "ingredients",
      },
      {
        to: "/categories",
        label: { fa: "دسته‌بندی‌ها", en: "Categories", ar: "الفئات" },
        icon: Tags,
        feature: "categories",
      },
      {
        to: "/menu",
        label: { fa: "منو و رسپی", en: "Menu & Recipes", ar: "القائمة والوصفات" },
        icon: BookOpen,
        feature: "menu",
      },
      {
        to: "/pricing",
        label: { fa: "قیمت‌گذاری و تصویب", en: "Pricing & Approvals", ar: "التسعير والاعتماد" },
        icon: BadgeDollarSign,
        feature: "pricing",
      },
      {
        to: "/suppliers",
        label: { fa: "تأمین‌کنندگان", en: "Suppliers", ar: "الموردون" },
        icon: Truck,
        feature: "suppliers",
      },
      {
        to: "/invoices",
        label: { fa: "فاکتورهای خرید", en: "Purchase Invoices", ar: "فواتير الشراء" },
        icon: ReceiptText,
        feature: "invoices",
      },
    ],
  },
  {
    title: {
      fa: "باشگاه مشتریان",
      en: "Customers & Loyalty",
      ar: "العملاء والولاء",
    },
    items: [
      {
        to: "/customers",
        label: { fa: "مشتریان", en: "Customers", ar: "العملاء" },
        icon: Users,
        feature: "customers",
      },
      {
        to: "/loyalty",
        label: { fa: "وفاداری و سطوح", en: "Loyalty Tiers", ar: "مستويات الولاء" },
        icon: Star,
        feature: "loyalty",
      },
      {
        to: "/vouchers",
        label: { fa: "کوپن‌های تخفیف", en: "Vouchers", ar: "كوبونات الخصم" },
        icon: TicketPercent,
        feature: "vouchers",
      },
      {
        to: "/rewards",
        label: { fa: "پاداش‌ها", en: "Rewards Catalog", ar: "كتالوج المكافآت" },
        icon: Gift,
        feature: "rewards",
      },
    ],
  },
  {
    title: {
      fa: "مالی و گزارش",
      en: "Finance & Reports",
      ar: "المالية والتقارير",
    },
    items: [
      {
        to: "/payments",
        label: { fa: "پرداخت‌ها", en: "Payments", ar: "المدفوعات" },
        icon: CreditCard,
        feature: "payments",
      },
      {
        to: "/sales",
        label: { fa: "فروش ماهانه", en: "Monthly Sales", ar: "المبيعات الشهرية" },
        icon: ShoppingCart,
        feature: "sales",
      },
      {
        to: "/expenses",
        label: { fa: "هزینه‌های سربار", en: "Overhead Expenses", ar: "المصاريف الثابتة" },
        icon: Wallet,
        feature: "expenses",
      },
      {
        to: "/reports",
        label: { fa: "گزارش سود و زیان", en: "P&L & Cost Reports", ar: "تقارير الأرباح والتكلفة" },
        icon: BarChart3,
        feature: "reports",
      },
    ],
  },
  {
    title: {
      fa: "سیستم و تنظیمات",
      en: "System",
      ar: "النظام والإعدادات",
    },
    items: [
      {
        to: "/printers",
        label: {
          fa: "چاپگرها و صف چاپ",
          en: "Printers & Print Queue",
          ar: "الطابعات وطابور الطباعة",
        },
        icon: Printer,
        feature: "printers",
      },
      {
        to: "/alerts",
        label: { fa: "هشدارها و اعلان‌ها", en: "Alerts", ar: "التنبيهات" },
        icon: BellRing,
        feature: "alerts",
      },
      {
        to: "/audit",
        label: {
          fa: "گزارش فعالیت کاربران",
          en: "User Activity Audit",
          ar: "سجل أنشطة المستخدمين",
        },
        icon: ScrollText,
        feature: "audit",
      },
      {
        to: "/settings",
        label: {
          fa: "تنظیمات، کاربران و امکانات",
          en: "Settings, Users & Modules",
          ar: "الإعدادات والمستخدمون والميزات",
        },
        icon: Settings,
      },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isEnabled } = useFeatureFlags();
  const { pick, t } = useI18n();

  return (
    <nav className="flex flex-col gap-4 p-3">
      {NAV_SECTIONS.map((section, idx) => {
        const visibleItems = section.items.filter(
          (item) => !item.feature || isEnabled(item.feature),
        );
        if (visibleItems.length === 0) return null;
        return (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-sidebar-foreground/50 uppercase">
              {pick(section.title)}
            </p>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{pick(item.label)}</span>
                </Link>
              );
            })}
          </div>
        );
      })}

      {isEnabled("online_menu") && (
        <a
          href="/online-menu"
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="mt-1 flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent"
        >
          <Coffee className="size-4 shrink-0" />
          <span className="truncate">
            {t("منوی آنلاین (عمومی)", "Online Menu (Public)", "القائمة العامة")}
          </span>
        </a>
      )}

      <a
        href="/settings?tab=wordpress"
        onClick={onNavigate}
        className="mt-1 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plug className="size-4 shrink-0" />
          <span className="truncate">
            {t("افزونه وردپرس", "WordPress Plugin", "إضافة ووردبريس")}
          </span>
        </span>
        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono">ZIP</span>
      </a>
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { activeUserName, activeRoleLabel, staffUser, loginAsStaff, signOut } = useAuth();
  const { data: bundle } = useHallyBundle();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { dir, t } = useI18n();

  const staffUsers = (bundle?.store.staff_users ?? []).filter((u) => u.is_active);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const brand = (
    <div className="flex flex-col gap-3 border-b border-sidebar-border px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Coffee className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-sidebar-foreground">
            {t("کافه هالی (Hally OS)", "Hally Business OS", "نظام مقهى هالي")}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {t(
              "مدیریت جامع و بهای تمام‌شده",
              "Cafe Operations & Cost Control",
              "إدارة المقهى والتكاليف",
            )}
          </p>
        </div>
      </div>
      <LanguageSwitcher variant="admin" className="w-fit" />
    </div>
  );

  const userFooter = (
    <div className="space-y-2 border-t border-sidebar-border p-3">
      <div className="rounded-lg bg-sidebar-accent/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate text-xs font-bold text-sidebar-foreground">
            <UserCheck className="size-3.5 shrink-0 text-sidebar-primary" />
            {activeUserName}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {activeRoleLabel}
          </Badge>
        </div>
        {staffUsers.length > 0 && (
          <div className="mt-2">
            <select
              aria-label={t("تعویض سریع کاربر پرسنل", "Quick Switch Staff User", "تبديل المستخدم")}
              value={staffUser?.id ?? ""}
              onChange={(e) => {
                const chosen = staffUsers.find((u) => u.id === e.target.value);
                if (chosen) {
                  loginAsStaff(chosen);
                  toast.success(
                    t(
                      `کاربر فعال به «${chosen.name}» (${STAFF_ROLE_LABELS[chosen.role]}) تغییر یافت`,
                      `Switched active user to ${chosen.name}`,
                      `تم تبديل المستخدم إلى ${chosen.name}`,
                    ),
                  );
                }
              }}
              className="h-7 w-full rounded border border-sidebar-border bg-sidebar px-2 text-[11px] text-sidebar-foreground"
            >
              <option value="" disabled>
                {t("تعویض کاربر / شیفت (تبلت)...", "Switch Staff / Shift...", "تبديل الموظف...")}
              </option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {STAFF_ROLE_LABELS[u.role]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Button variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>
        <LogOut className="size-4" />
        {t("خروج از حساب", "Sign Out", "تسجيل الخروج")}
      </Button>
    </div>
  );

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 hidden w-64 flex-col bg-sidebar lg:flex",
          dir === "rtl" ? "right-0" : "left-0",
        )}
      >
        {brand}
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        {userFooter}
      </aside>

      <div className={cn(dir === "rtl" ? "lg:mr-64" : "lg:ml-64")}>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={dir === "rtl" ? "right" : "left"}
              dir={dir}
              className="w-64 overflow-y-auto bg-sidebar p-0"
            >
              <SheetTitle className="sr-only">
                {t("منوی ناوبری", "Navigation Menu", "قائمة التنقل")}
              </SheetTitle>
              {brand}
              <NavList onNavigate={() => setOpen(false)} />
              {userFooter}
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">
              {t("کافه هالی (Hally OS)", "Hally Business OS", "نظام مقهى هالي")}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {activeUserName} ({activeRoleLabel})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher variant="admin" />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
