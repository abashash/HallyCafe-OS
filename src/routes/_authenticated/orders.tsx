import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  syncPaidOrderToSupabaseAndInventory,
  useFeatureFlags,
  useHallyBundle,
  useHallyMutation,
} from "@/lib/hally-os";
import type { CafeOrder, OrderStatus, PaymentProvider } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [{ title: "صف سفارش‌ها | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="orders">
      <OrdersPage />
    </FeatureGuard>
  ),
});

function OrdersPage() {
  const { t, formatMoney, formatNumber, formatDateTime } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const queryClient = useQueryClient();
  const { data: bundle, refetch, isFetching } = useHallyBundle(10000);
  const mutation = useHallyMutation();
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const [settleOrder, setSettleOrder] = useState<CafeOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<PaymentProvider>("card");
  const [settleRef, setSettleRef] = useState("");

  const orders = (bundle?.store.orders ?? []).filter((o) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return o.status !== "paid" && o.status !== "cancelled";
    }
    return o.status === statusFilter;
  });

  async function transitionOrder(
    order: CafeOrder,
    nextStatus: OrderStatus,
    provider?: PaymentProvider,
    paymentReference?: string,
  ) {
    try {
      await mutation.mutateAsync({
        type: "update_order_status",
        id: order.id,
        status: nextStatus,
        ...(provider ? { provider } : {}),
        ...(paymentReference ? { payment_reference: paymentReference } : {}),
      });
      if (nextStatus === "paid" && !order.sales_synced) {
        await syncPaidOrderToSupabaseAndInventory(order, (act) => mutation.mutateAsync(act), {
          syncSales: isEnabled("sales"),
          syncInventory: isEnabled("inventory"),
        });
        await queryClient.invalidateQueries({ queryKey: ["monthly_sales"] });
        await queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      }
      toast.success(
        t(
          `وضعیت سفارش #${order.order_number} تغییر یافت`,
          `Order #${order.order_number} status updated`,
          `تم تحديث حالة الطلب #${order.order_number}`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleConfirmSettle() {
    if (!settleOrder) return;
    if (settleMethod === "card" && !settleRef.trim()) {
      toast.error(
        t(
          "برای پرداخت از طریق کارتخوان (پوز)، وارد کردن شماره پرداخت فیش الزامی است.",
          "POS receipt tracking number is required for card terminal payments.",
          "رقم إيصال جهاز نقاط البيع مطلوب عند الدفع بالبطاقة.",
        ),
      );
      return;
    }
    await transitionOrder(
      settleOrder,
      "paid",
      settleMethod,
      settleMethod === "card" ? settleRef.trim() : undefined,
    );
    setSettleOrder(null);
    setSettleRef("");
  }

  function statusBadge(status: OrderStatus) {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">{t("در انتظار", "Pending", "قيد الانتظار")}</Badge>;
      case "preparing":
        return <Badge>{t("در حال آماده‌سازی", "Preparing", "قيد التحضير")}</Badge>;
      case "ready":
        return <Badge className="bg-amber-600">{t("آماده", "Ready", "جاهز")}</Badge>;
      case "served":
        return <Badge className="bg-blue-600">{t("تحویل شده", "Served", "تم التقديم")}</Badge>;
      case "paid":
        return <Badge className="bg-emerald-600">{t("پرداخت شد", "Paid", "مدفوع")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t("لغو شد", "Cancelled", "ملغى")}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("صف سفارش‌ها و چرخه عمر سفارش", "Live Orders Queue", "طابور الطلبات المباشر")}
        description={t(
          "مدیریت سفارش‌های آنلاین و حضوری؛ سفارش‌های پرداخت‌شده به صورت خودکار به فروش ماهانه اضافه و از موجودی انبار کسر می‌شوند.",
          "Manage online and POS orders. Paid orders automatically accumulate into monthly sales and deduct recipe stock.",
          "إدارة الطلبات عبر الإنترنت والحضورية؛ تتم مزامنة الطلبات المدفوعة تلقائياً مع المبيعات والمخزون.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  {t("صف فعال", "Active Queue", "الطابور النشط")}
                </SelectItem>
                <SelectItem value="pending">{t("در انتظار", "Pending", "قيد الانتظار")}</SelectItem>
                <SelectItem value="preparing">
                  {t("در حال آماده‌سازی", "Preparing", "قيد التحضير")}
                </SelectItem>
                <SelectItem value="served">{t("تحویل شده", "Served", "تم التقديم")}</SelectItem>
                <SelectItem value="paid">{t("پرداخت شده", "Paid", "مدفوع")}</SelectItem>
                <SelectItem value="cancelled">{t("لغو شده", "Cancelled", "ملغى")}</SelectItem>
                <SelectItem value="all">
                  {t("همه سفارش‌ها", "All Orders", "جميع الطلبات")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <ClipboardList className="mb-3 size-10 opacity-40" />
              <p className="font-semibold">
                {t("سفارشی در این فیلتر یافت نشد", "No orders found", "لم يتم العثور على طلبات")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("شماره", "Order #", "رقم الطلب")}</TableHead>
                  <TableHead>{t("نوع / میز", "Type / Table", "النوع / الطاولة")}</TableHead>
                  <TableHead>{t("مشتری", "Customer", "العميل")}</TableHead>
                  <TableHead>{t("اقلام سفارش", "Items", "العناصر")}</TableHead>
                  <TableHead>{t("مبلغ کل", "Total", "الإجمالي")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-bold">
                      <div>#{formatNumber(ord.order_number)}</div>
                      <div className="text-[11px] font-normal text-muted-foreground">
                        {formatDateTime(ord.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ord.order_type === "dine_in"
                          ? ord.table_name || ord.table_code || t("سالن", "Dine-in", "صالة")
                          : ord.order_type === "takeaway"
                            ? t("بیرون‌بر", "Takeaway", "سفري")
                            : t("پیک", "Delivery", "توصيل")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{ord.customer_name}</div>
                      {ord.customer_phone && (
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {ord.customer_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-xs">
                        {ord.items
                          .map((i) => `${i.item_name} ×${formatNumber(i.quantity)}`)
                          .join("، ")}
                      </p>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      <div>{formatMoney(ord.total)}</div>
                      {ord.payment_reference && (
                        <div className="mt-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                          {t("فیش پوز:", "POS Ref:", "إيصال POS:")} {ord.payment_reference}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(ord.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ord.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => transitionOrder(ord, "preparing")}
                          >
                            {t("شروع پخت", "Prepare", "تحضير")}
                          </Button>
                        )}
                        {ord.status === "preparing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => transitionOrder(ord, "served")}
                          >
                            {t("تحویل", "Serve", "تقديم")}
                          </Button>
                        )}
                        {(ord.status === "pending" ||
                          ord.status === "preparing" ||
                          ord.status === "ready" ||
                          ord.status === "served") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (isEnabled("payments")) {
                                setSettleOrder(ord);
                                setSettleMethod("card");
                                setSettleRef("");
                              } else {
                                void transitionOrder(ord, "paid", "cash");
                              }
                            }}
                          >
                            <CheckCircle2 className="size-3.5" />
                            {t("تسویه (پرداخت)", "Mark Paid", "تسوية الدفع")}
                          </Button>
                        )}
                        {(ord.status === "pending" || ord.status === "preparing") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            onClick={() => transitionOrder(ord, "cancelled")}
                          >
                            <XCircle className="size-4" />
                          </Button>
                        )}
                        {isEnabled("printers") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => {
                              mutation.mutate({ type: "reprint_order", order_id: ord.id });
                              toast.success(
                                t(
                                  "به صف چاپ اضافه شد",
                                  "Added to print queue",
                                  "تمت الإضافة للطباعة",
                                ),
                              );
                            }}
                            title={t("چاپ مجدد", "Reprint", "إعادة طباعة")}
                          >
                            <Printer className="size-4" />
                          </Button>
                        )}
                        {isEnabled("online_menu") && (
                          <Button asChild size="icon" variant="ghost" className="size-8">
                            <Link
                              to="/online-menu"
                              search={{ order: ord.token } as never}
                              target="_blank"
                              title={t(
                                "لینک پیگیری مشتری",
                                "Customer Tracking Link",
                                "رابط تتبع العميل",
                              )}
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(settleOrder)} onOpenChange={(o) => !o && setSettleOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {t("تسویه و پرداخت سفارش", "Settle Order Payment", "تسوية دفع الطلب")}{" "}
              {settleOrder ? `#${formatNumber(settleOrder.order_number)}` : ""}
            </DialogTitle>
          </DialogHeader>
          {settleOrder && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span>{settleOrder.table_name || settleOrder.customer_name}</span>
                <span className="font-bold text-primary">{formatMoney(settleOrder.total)}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("روش پرداخت", "Payment Method", "طريقة الدفع")}
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["card", t("کارتخوان (POS)", "Card (POS)", "نقاط البيع")],
                      ["cash", t("نقدی", "Cash", "نقداً")],
                      ["zarinpal", t("آنلاین", "Online", "إلكتروني")],
                    ] as const
                  ).map(([k, label]) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={settleMethod === k ? "default" : "outline"}
                      onClick={() => setSettleMethod(k)}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {settleMethod === "card" && (
                <div className="space-y-1.5 rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <Label className="text-xs font-bold text-primary">
                    {t(
                      "شماره پرداخت فیش کارتخوان (POS) *",
                      "POS Receipt Tracking Number *",
                      "رقم إيصال جهاز نقاط البيع (POS) *",
                    )}
                  </Label>
                  <Input
                    dir="ltr"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder={t(
                      "شماره پیگیری / فیش پوز را وارد کنید...",
                      "Enter POS receipt number...",
                      "أدخل رقم إيصال جهاز الدفع...",
                    )}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleConfirmSettle}
                disabled={mutation.isPending}
              >
                <CheckCircle2 className="size-4" />
                {t("تایید و ثبت پرداخت", "Confirm Payment", "تأكيد الدفع")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
