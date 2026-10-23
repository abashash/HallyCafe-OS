import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, CheckCircle2, Clock, Flame, Monitor, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { CafeOrder, OrderStatus } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kds")({
  head: () => ({
    meta: [{ title: "نمایشگر آشپزخانه (KDS) | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="kds">
      <KdsPage />
    </FeatureGuard>
  ),
});

const COLUMNS: Array<{
  status: OrderStatus;
  titleFa: string;
  titleEn: string;
  titleAr: string;
  nextStatus: OrderStatus | null;
  nextLabelFa: string;
  nextLabelEn: string;
  nextLabelAr: string;
}> = [
  {
    status: "pending",
    titleFa: "در انتظار",
    titleEn: "Pending",
    titleAr: "قيد الانتظار",
    nextStatus: "preparing",
    nextLabelFa: "شروع آماده‌سازی",
    nextLabelEn: "Start Preparing",
    nextLabelAr: "بدء التحضير",
  },
  {
    status: "preparing",
    titleFa: "در حال آماده‌سازی",
    titleEn: "Preparing",
    titleAr: "قيد التحضير",
    nextStatus: "ready",
    nextLabelFa: "آماده تحویل",
    nextLabelEn: "Mark Ready",
    nextLabelAr: "جاهز للتسليم",
  },
  {
    status: "ready",
    titleFa: "آماده سرو",
    titleEn: "Ready",
    titleAr: "جاهز للتقديم",
    nextStatus: "served",
    nextLabelFa: "تحویل شد",
    nextLabelEn: "Mark Served",
    nextLabelAr: "تم التقديم",
  },
  {
    status: "served",
    titleFa: "تحویل شده",
    titleEn: "Served",
    titleAr: "تم التقديم",
    nextStatus: null,
    nextLabelFa: "",
    nextLabelEn: "",
    nextLabelAr: "",
  },
];

function KdsPage() {
  const { t, formatNumber, formatDateTime } = useI18n();
  const { data: bundle, refetch, isFetching } = useHallyBundle(8000);
  const mutation = useHallyMutation();
  const [stationFilter, setStationFilter] = useState<"all" | "kitchen" | "bar">("all");

  const orders = (bundle?.store.orders ?? []).filter((o) => {
    if (o.status === "paid" || o.status === "cancelled") return false;
    if (stationFilter !== "all" && o.station !== "both" && o.station !== stationFilter) {
      return false;
    }
    return true;
  });

  async function advanceOrder(order: CafeOrder, next: OrderStatus) {
    try {
      await mutation.mutateAsync({
        type: "update_order_status",
        id: order.id,
        status: next,
      });
      toast.success(
        t(
          `سفارش #${order.order_number} به‌روزرسانی شد`,
          `Order #${order.order_number} updated`,
          `تم تحديث الطلب #${order.order_number}`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "نمایشگر آشپزخانه و بار (KDS)",
          "Kitchen & Bar Display (KDS)",
          "شاشة عرض المطبخ والبار (KDS)",
        )}
        description={t(
          "صف زنده سفارش‌ها با بروزرسانی خودکار هر ۸ ثانیه.",
          "Live order preparation board with 8-second auto-refresh.",
          "لوحة تحضير الطلبات المباشرة مع تحديث تلقائي كل 8 ثوانٍ.",
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border p-1">
              {(
                [
                  ["all", t("همه ایستگاه‌ها", "All Stations", "جميع المحطات")],
                  ["kitchen", t("آشپزخانه", "Kitchen", "المطبخ")],
                  ["bar", t("بار گرم و سرد", "Coffee & Bar", "البار")],
                ] as const
              ).map(([st, label]) => (
                <Button
                  key={st}
                  size="sm"
                  variant={stationFilter === st ? "default" : "ghost"}
                  onClick={() => setStationFilter(st)}
                  className="h-8"
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("بروزرسانی", "Refresh", "تحديث")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <Card key={col.status} className="flex flex-col bg-muted/20">
              <CardHeader className="border-b bg-card pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <Monitor className="size-4 text-primary" />
                    {t(col.titleFa, col.titleEn, col.titleAr)}
                  </span>
                  <Badge>{formatNumber(colOrders.length)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 p-3">
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                    <ChefHat className="mb-2 size-8 opacity-40" />
                    {t(
                      "سفارشی در این مرحله نیست",
                      "No orders in this stage",
                      "لا توجد طلبات في هذه المرحلة",
                    )}
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="space-y-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-primary">
                          #{formatNumber(ord.order_number)}
                        </span>
                        <Badge variant="outline">
                          {ord.order_type === "dine_in"
                            ? ord.table_name || ord.table_code || t("سالن", "Dine-in", "صالة")
                            : ord.order_type === "takeaway"
                              ? t("بیرون‌بر", "Takeaway", "سفري")
                              : t("پیک", "Delivery", "توصيل")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>{formatDateTime(ord.created_at)}</span>
                        <span>•</span>
                        <span>{ord.customer_name}</span>
                      </div>

                      <ul className="space-y-1.5 border-y border-border py-2 text-sm">
                        {ord.items.map((it, idx) => (
                          <li key={idx} className="flex items-center justify-between font-medium">
                            <span>
                              {it.item_name}
                              {it.option_label ? ` (${it.option_label})` : ""}
                            </span>
                            <Badge variant="secondary" className="font-bold">
                              ×{formatNumber(it.quantity)}
                            </Badge>
                          </li>
                        ))}
                      </ul>

                      {ord.notes && (
                        <p className="rounded bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                          {ord.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {col.nextStatus && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => advanceOrder(ord, col.nextStatus!)}
                          >
                            {col.status === "pending" ? (
                              <Flame className="size-4" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            {t(col.nextLabelFa, col.nextLabelEn, col.nextLabelAr)}
                          </Button>
                        )}
                        {(col.status === "pending" || col.status === "preparing") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            onClick={() => advanceOrder(ord, "cancelled")}
                            title={t("لغو سفارش", "Cancel Order", "إلغاء الطلب")}
                          >
                            <XCircle className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
