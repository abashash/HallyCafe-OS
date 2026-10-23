import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Wallet,
  BellRing,
  Percent,
  Store,
  Monitor,
  ClipboardList,
  Users,
  CalendarCheck,
  Settings,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { foodCostPercent, recipeCost } from "@/lib/costing";
import { useFeatureFlags, useHallyBundle } from "@/lib/hally-os";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtNum, fmtPercent, fmtPrice } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "داشبورد | کافه هالی" },
      {
        name: "description",
        content: "نمای کلی عملیات کافه، سفارش‌ها، بهای تمام‌شده، انبار و باشگاه مشتریان.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { t, formatNumber } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const { data: hallyBundle } = useHallyBundle(15000);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [ings, items, recipes, alerts, expenses] = await Promise.all([
        supabase.from("ingredients").select("*"),
        supabase.from("menu_items").select("*"),
        supabase.from("recipe_items").select("*"),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("operating_expenses").select("amount,is_monthly"),
      ]);
      if (ings.error) throw ings.error;
      return {
        ingredients: ings.data ?? [],
        items: items.data ?? [],
        recipes: recipes.data ?? [],
        alerts: alerts.data ?? [],
        expenses: expenses.data ?? [],
      };
    },
  });

  const ingredients = data?.ingredients ?? [];
  const monthlyOverhead = (data?.expenses ?? [])
    .filter((e) => e.is_monthly)
    .reduce((s, e) => s + Number(e.amount), 0);

  const costed = (data?.items ?? []).map((m) => {
    const lines = (data?.recipes ?? []).filter((r) => r.menu_item_id === m.id);
    const cost = recipeCost(lines, ingredients);
    return { ...m, cost, fc: foodCostPercent(cost, Number(m.selling_price)) };
  });
  const avgFc = costed.length
    ? costed.reduce((s, c) => s + c.fc, 0) / costed.filter(() => true).length
    : 0;

  const activeOrdersCount = (hallyBundle?.store.orders ?? []).filter(
    (o) => o.status !== "paid" && o.status !== "cancelled",
  ).length;
  const activeReservationsCount = (hallyBundle?.store.reservations ?? []).filter(
    (r) => r.status === "reserved" || r.status === "confirmed",
  ).length;
  const customersCount = hallyBundle?.store.customers.length ?? 0;

  return (
    <>
      <PageHeader
        title={t("داشبورد جامع کافه هالی", "Hally OS Dashboard", "لوحة تحكم مقهى هالي")}
        description={t(
          "نمای کلی عملیات زنده کافه، سفارش‌ها، هزینه‌ها و بهای تمام‌شده",
          "Real-time overview of cafe operations, orders, costs, and food cost metrics",
          "نظرة عامة مباشرة على عمليات المقهى والطلبات والتكاليف",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            {isEnabled("pos") && (
              <Button asChild size="sm">
                <Link to="/pos">
                  <Store className="size-4" />
                  {t("صندوق (POS)", "POS Terminal", "نقطة البيع")}
                </Link>
              </Button>
            )}
            {isEnabled("kds") && (
              <Button asChild size="sm" variant="outline">
                <Link to="/kds">
                  <Monitor className="size-4" />
                  {t("آشپزخانه (KDS)", "Kitchen Display", "شاشة المطبخ")}
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">
                <Settings className="size-4" />
                {t("مدیریت امکانات", "Manage Features", "إدارة الميزات")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isEnabled("orders") && (
          <Stat
            title={t("سفارش‌های فعال در جریان", "Active Live Orders", "الطلبات النشطة")}
            value={formatNumber(activeOrdersCount)}
            icon={ClipboardList}
          />
        )}
        {isEnabled("reservations") && (
          <Stat
            title={t("رزروهای فعال میز", "Active Reservations", "الحجوزات النشطة")}
            value={formatNumber(activeReservationsCount)}
            icon={CalendarCheck}
          />
        )}
        {isEnabled("customers") && (
          <Stat
            title={t("اعضای باشگاه مشتریان", "Loyalty Members", "أعضاء نادي الولاء")}
            value={formatNumber(customersCount)}
            icon={Users}
          />
        )}
        {isEnabled("menu") && (
          <Stat
            title={t("میانگین فودکاست", "Avg Food Cost %", "متوسط تكلفة الطعام")}
            value={fmtPercent(avgFc)}
            icon={Percent}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {isEnabled("ingredients") && (
          <Stat
            title={t("تعداد مواد اولیه", "Ingredients Count", "عدد المواد الأولية")}
            value={fmtNum(ingredients.length)}
            icon={Package}
          />
        )}
        {isEnabled("expenses") && (
          <Stat
            title={t("سربار ماهانه", "Monthly Overhead", "المصاريف الشهرية")}
            value={fmtPrice(monthlyOverhead)}
            icon={Wallet}
          />
        )}
        {isEnabled("alerts") && (
          <Stat
            title={t("هشدارهای فعال", "Active Alerts", "التنبيهات النشطة")}
            value={fmtNum(data?.alerts?.length ?? 0)}
            icon={BellRing}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isEnabled("menu") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t(
                  "پرهزینه‌ترین آیتم‌های منو",
                  "Highest Food Cost Menu Items",
                  "أعلى عناصر القائمة تكلفة",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {costed
                .sort((a, b) => b.fc - a.fc)
                .slice(0, 6)
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">
                      {fmtPrice(c.cost)} · {t("فودکاست", "FC", "التكلفة")} {fmtPercent(c.fc)}
                    </span>
                  </div>
                ))}
              {costed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("هنوز آیتمی ثبت نشده است.", "No menu items yet.", "لم يتم تسجيل عناصر بعد.")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        {isEnabled("alerts") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("آخرین هشدارها", "Recent Alerts", "أحدث التنبيهات")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.alerts ?? []).map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                  <span>{a.message}</span>
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>
                    {fmtDate(a.created_at)}
                  </Badge>
                </div>
              ))}
              {(data?.alerts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("هشداری وجود ندارد.", "No active alerts.", "لا توجد تنبيهات.")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
