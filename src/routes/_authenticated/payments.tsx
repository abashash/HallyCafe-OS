import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, RotateCcw } from "lucide-react";
import { useState } from "react";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [{ title: "پرداخت‌ها و تراکنش‌ها | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="payments">
      <PaymentsPage />
    </FeatureGuard>
  ),
});

function PaymentsPage() {
  const { t, formatMoney, formatNumber, formatDateTime } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const payments = (bundle?.store.payments ?? []).filter(
    (p) => providerFilter === "all" || p.provider === providerFilter,
  );

  const totalSuccess = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "مدیریت پرداخت‌ها و تراکنش‌ها",
          "Payments & Settlement Ledger",
          "إدارة المدفوعات والمعاملات",
        )}
        description={t(
          "رهگیری تمامی تراکنش‌های صندوق (نقدی، کارتخوان) و درگاه‌های آنلاین (زرین‌پال، زیبال).",
          "Audit counter cash/card settlements and online payment gateway transactions.",
          "تتبع جميع معاملات الدفع النقدي والبطاقات وبوابات الدفع الإلكتروني.",
        )}
        actions={
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("همه روش‌ها", "All Methods", "جميع الطرق")}</SelectItem>
              <SelectItem value="card">{t("کارتخوان", "POS Card", "بطاقة")}</SelectItem>
              <SelectItem value="cash">{t("نقدی", "Cash", "نقدي")}</SelectItem>
              <SelectItem value="zarinpal">{t("زرین‌پال", "Zarinpal", "زرين بال")}</SelectItem>
              <SelectItem value="zibal">{t("زیبال", "Zibal", "زيبال")}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("جمع پرداخت‌های موفق", "Total Successful Payments", "إجمالي المدفوعات الناجحة")}
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {formatMoney(totalSuccess)}
              </p>
            </div>
            <CheckCircle2 className="size-8 text-emerald-500/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("تعداد تراکنش‌ها", "Transactions Count", "عدد المعاملات")}
              </p>
              <p className="mt-1 text-2xl font-black text-primary">
                {formatNumber(payments.length)}
              </p>
            </div>
            <CreditCard className="size-8 text-primary/40" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">
              {t(
                "تراکنشی ثبت نشده است. با تسویه سفارش در صندوق (POS) تراکنش‌ها اینجا ثبت می‌شوند.",
                "No payments recorded yet. Settling orders in POS records transactions here.",
                "لا توجد معاملات مسجلة بعد.",
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("شناسه مرجع", "Reference", "المرجع")}</TableHead>
                  <TableHead>{t("سفارش", "Order", "الطلب")}</TableHead>
                  <TableHead>{t("مشتری", "Customer", "العميل")}</TableHead>
                  <TableHead>{t("روش پرداخت", "Provider", "طريقة الدفع")}</TableHead>
                  <TableHead>{t("مبلغ", "Amount", "المبلغ")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <code>{p.reference_id}</code>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateTime(p.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">#{formatNumber(p.order_number)}</TableCell>
                    <TableCell>{p.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.provider}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {formatMoney(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "success"
                            ? "default"
                            : p.status === "refunded"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "success" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            mutation.mutate({
                              type: "update_payment_status",
                              id: p.id,
                              status: "refunded",
                            })
                          }
                        >
                          <RotateCcw className="size-3.5" />
                          {t("استرداد وجه", "Refund", "استرداد")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
