import { createFileRoute } from "@tanstack/react-router";
import { Coins, Plus, Receipt, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFeatureFlags, useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { CustomerProfile } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [{ title: "دفترچه مشتریان | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="customers">
      <CustomersPage />
    </FeatureGuard>
  ),
});

function CustomersPage() {
  const { t, formatMoney, formatNumber, formatDateTime } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");

  const [pointsCust, setPointsCust] = useState<CustomerProfile | null>(null);
  const [pointsDelta, setPointsDelta] = useState("");
  const [pointsNote, setPointsNote] = useState("");
  const [invoicesCust, setInvoicesCust] = useState<CustomerProfile | null>(null);

  const customers = (bundle?.store.customers ?? []).filter((c) => {
    const q = search.trim();
    if (!q) return true;
    return c.name.includes(q) || c.mobile.includes(q);
  });

  async function handleCreate() {
    if (!name.trim() || !mobile.trim()) {
      toast.error(
        t("نام و موبایل الزامی است", "Name and mobile required", "الاسم والجوال مطلوبان"),
      );
      return;
    }
    await mutation.mutateAsync({
      type: "upsert_customer",
      customer: { name, mobile, notes },
    });
    setName("");
    setMobile("");
    setNotes("");
    setOpen(false);
    toast.success(t("مشتری ثبت شد", "Customer saved", "تم حفظ العميل"));
  }

  async function handleAdjustPoints() {
    if (!pointsCust) return;
    const delta = Number(pointsDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error(t("مقدار امتیاز معتبر وارد کنید", "Enter valid points delta", "أدخل نقاط صالحة"));
      return;
    }
    await mutation.mutateAsync({
      type: "adjust_customer_points",
      customer_id: pointsCust.id,
      delta,
      note: pointsNote,
    });
    setPointsCust(null);
    setPointsDelta("");
    setPointsNote("");
    toast.success(t("امتیاز مشتری تعدیل شد", "Customer points adjusted", "تم تعديل نقاط العميل"));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("دفترچه مشتریان", "Customers Directory", "دليل العملاء")}
        description={t(
          "مدیریت پروفایل مشتریان، مجموع خرید، سطح وفاداری و تعدیل دستی امتیازات.",
          "Manage customer profiles, total spend, loyalty tier, and manual point adjustments.",
          "إدارة ملفات العملاء وإجمالي المشتريات ومستوى الولاء وتعديل النقاط.",
        )}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                {t("مشتری جدید", "New Customer", "عميل جديد")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("افزودن مشتری جدید", "Add Customer", "إضافة عميل جديد")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("نام و نام خانوادگی", "Full Name", "الاسم الكامل")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("شماره موبایل", "Mobile Number", "رقم الجوال")}</Label>
                  <Input dir="ltr" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("یادداشت (سلیقه مشتری و …)", "Notes", "ملاحظات")}</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreate}>
                  {t("ثبت مشتری", "Save Customer", "حفظ العميل")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "جستجوی نام یا شماره موبایل…",
            "Search name or mobile…",
            "بحث بالاسم أو الجوال…",
          )}
          className="pe-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="mb-2 size-10 opacity-40" />
              <p>{t("مشتری‌ای یافت نشد", "No customers found", "لم يتم العثور على عملاء")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("نام مشتری", "Customer", "العميل")}</TableHead>
                  <TableHead>{t("شماره موبایل", "Mobile", "الجوال")}</TableHead>
                  {isEnabled("loyalty") && (
                    <TableHead>{t("سطح وفاداری", "Loyalty Tier", "مستوى الولاء")}</TableHead>
                  )}
                  {isEnabled("loyalty") && (
                    <TableHead>{t("موجودی امتیاز", "Points", "النقاط")}</TableHead>
                  )}
                  <TableHead>{t("مجموع خرید", "Total Spend", "إجمالي المشتريات")}</TableHead>
                  <TableHead>{t("تعداد سفارش", "Orders", "الطلبات")}</TableHead>
                  <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-bold">{c.name}</div>
                      {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {c.mobile}
                    </TableCell>
                    {isEnabled("loyalty") && (
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {c.loyalty_level}
                        </Badge>
                      </TableCell>
                    )}
                    {isEnabled("loyalty") && (
                      <TableCell className="font-extrabold text-primary">
                        {formatNumber(c.loyalty_points)}
                      </TableCell>
                    )}
                    <TableCell>{formatMoney(c.total_spent)}</TableCell>
                    <TableCell>{formatNumber(c.orders_count)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isEnabled("orders") && (
                          <Button size="sm" variant="outline" onClick={() => setInvoicesCust(c)}>
                            <Receipt className="size-3.5" />
                            {t("فاکتورهای سابق", "Past Invoices", "الفواتير السابقة")}
                          </Button>
                        )}
                        {isEnabled("loyalty") && (
                          <Button size="sm" variant="outline" onClick={() => setPointsCust(c)}>
                            <Coins className="size-3.5" />
                            {t("تعدیل امتیاز", "Adjust Points", "تعديل النقاط")}
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

      <Dialog open={Boolean(invoicesCust)} onOpenChange={(o) => !o && setInvoicesCust(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("فاکتورهای سابق مشتری:", "Customer Past Invoices:", "الفواتير السابقة للعميل:")}{" "}
              {invoicesCust?.name} ({invoicesCust?.mobile})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {(() => {
              const custOrders = (bundle?.store.orders ?? []).filter(
                (o) =>
                  o.customer_id === invoicesCust?.id || o.customer_phone === invoicesCust?.mobile,
              );
              if (custOrders.length === 0) {
                return (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t(
                      "فاکتوری برای این مشتری ثبت نشده است.",
                      "No invoices found for this customer.",
                      "لا توجد فواتير لهذا العميل.",
                    )}
                  </p>
                );
              }
              return custOrders.map((ord) => (
                <div key={ord.id} className="space-y-2 rounded-xl border p-3.5 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">
                        #{formatNumber(ord.order_number)}
                      </span>
                      {ord.table_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {ord.table_name}
                        </Badge>
                      )}
                      {ord.payment_reference && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {t("فیش پوز:", "POS Ref:", "إيصال POS:")} {ord.payment_reference}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">{formatDateTime(ord.created_at)}</span>
                  </div>
                  <div className="space-y-1">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {it.item_name}
                          {it.option_label ? ` (${it.option_label})` : ""} ×{" "}
                          {formatNumber(it.quantity)}
                        </span>
                        <span className="font-semibold">{formatMoney(it.line_total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 font-bold">
                    <span>{t("جمع کل فاکتور:", "Total:", "الإجمالي:")}</span>
                    <span className="text-sm text-primary">{formatMoney(ord.total)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pointsCust)} onOpenChange={(o) => !o && setPointsCust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("تعدیل امتیاز وفاداری:", "Adjust Loyalty Points:", "تعديل نقاط الولاء:")}{" "}
              {pointsCust?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>
                {t(
                  "مقدار تغییر امتیاز (عدد مثبت برای افزایش، منفی برای کسر)",
                  "Points Delta (+ to add, - to deduct)",
                  "تغيير النقاط (+ للإضافة، - للخصم)",
                )}
              </Label>
              <Input
                type="number"
                dir="ltr"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(e.target.value)}
                placeholder="+50 / -20"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("علت تعدیل", "Reason", "السبب")}</Label>
              <Input value={pointsNote} onChange={(e) => setPointsNote(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleAdjustPoints}>
              {t("ثبت در دفتر کل امتیازات", "Save Point Adjustment", "حفظ التعديل")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
