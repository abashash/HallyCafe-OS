import { createFileRoute } from "@tanstack/react-router";
import { Plus, TicketPercent, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/vouchers")({
  head: () => ({
    meta: [{ title: "کوپن‌های تخفیف | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="vouchers">
      <VouchersPage />
    </FeatureGuard>
  ),
});

function VouchersPage() {
  const { t, formatMoney, formatNumber, formatDate } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("1000000");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [usageLimit, setUsageLimit] = useState("100");
  const [expiresAt, setExpiresAt] = useState(() => new Date().toISOString().slice(0, 10));

  const vouchers = bundle?.store.vouchers ?? [];

  async function handleCreate() {
    if (!code.trim() || !title.trim()) {
      toast.error(
        t("کد و عنوان کوپن الزامی است", "Code and title required", "الكود والعنوان مطلوبان"),
      );
      return;
    }
    await mutation.mutateAsync({
      type: "upsert_voucher",
      voucher: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        kind,
        value: Number(value) || 0,
        min_order: Number(minOrder) || 0,
        max_discount: Number(maxDiscount) || 0,
        usage_limit: Number(usageLimit) || 0,
        expires_at: expiresAt || null,
      },
    });
    setCode("");
    setTitle("");
    setOpen(false);
    toast.success(t("کوپن تخفیف ایجاد شد", "Voucher created", "تم إنشاء الكوبون"));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("کوپن‌های تخفیف", "Discount Vouchers", "قسائم وكوبونات الخصم")}
        description={t(
          "تعریف کدهای تخفیف درصدی و مبلغ ثابت قابل استفاده در صندوق فروش و منوی آنلاین.",
          "Create percentage or fixed discount codes usable in both POS and the public online menu.",
          "إنشاء أكواد خصم بنسبة مئوية أو مبلغ ثابت للاستخدام في نقطة البيع والقائمة.",
        )}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                {t("کوپن جدید", "New Voucher", "كوبون جديد")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("تعریف کوپن تخفیف", "Create Discount Voucher", "إنشاء كوبون خصم")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("کد کوپن (انگلیسی)", "Code", "الكود")}</Label>
                    <Input
                      dir="ltr"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="HALLY20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("عنوان کوپن", "Title", "العنوان")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("نوع تخفیف", "Discount Type", "نوع الخصم")}</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as "percent" | "fixed")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">
                          {t("درصدی (٪)", "Percentage (%)", "نسبة مئوية (%)")}
                        </SelectItem>
                        <SelectItem value="fixed">
                          {t("مبلغ ثابت", "Fixed Amount", "مبلغ ثابت")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("مقدار تخفیف", "Value", "القيمة")}</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("حداقل مبلغ سفارش", "Min Order Amount", "الحد الأدنى للطلب")}</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("سقف تعداد استفاده", "Usage Limit", "حد الاستخدام")}</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>
                      {t(
                        "حداکثر تخفیف (۰ = نامحدود)",
                        "Max Discount (0 = None)",
                        "الحد الأقصى للخصم",
                      )}
                    </Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t("تاریخ انقضا (شمسی)", "Expiry Date (Jalali)", "تاريخ الانتهاء")}
                    </Label>
                    <JalaliDatePicker value={expiresAt} onChange={setExpiresAt} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate}>
                  {t("ثبت کوپن", "Save Voucher", "حفظ الكوبون")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          {vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TicketPercent className="mb-2 size-10 opacity-40" />
              <p>{t("کوپنی یافت نشد", "No vouchers found", "لا توجد كوبونات")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("کد", "Code", "الكود")}</TableHead>
                  <TableHead>{t("عنوان", "Title", "العنوان")}</TableHead>
                  <TableHead>{t("مقدار تخفیف", "Discount", "الخصم")}</TableHead>
                  <TableHead>{t("حداقل خرید", "Min Order", "الحد الأدنى")}</TableHead>
                  <TableHead>{t("مصرف‌شده / سقف", "Usage", "الاستخدام")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <code className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
                        {v.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-bold">
                      <div>{v.title}</div>
                      {v.expires_at && (
                        <div className="text-[11px] font-normal text-muted-foreground">
                          {t("انقضا:", "Expires:", "الانتهاء:")} {formatDate(v.expires_at)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {v.kind === "percent" ? `${formatNumber(v.value)}%` : formatMoney(v.value)}
                    </TableCell>
                    <TableCell>{formatMoney(v.min_order)}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {formatNumber(v.used_count)} /{" "}
                      {v.usage_limit ? formatNumber(v.usage_limit) : "∞"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={v.status === "active"}
                          onCheckedChange={() =>
                            mutation.mutate({ type: "toggle_voucher_status", id: v.id })
                          }
                        />
                        <Badge
                          className={
                            v.status === "active"
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }
                        >
                          {v.status === "active"
                            ? t("فعال", "Active", "نشط")
                            : t("غیرفعال", "Disabled", "معطل")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={v.status === "active" ? "outline" : "default"}
                          onClick={() =>
                            mutation.mutate({ type: "toggle_voucher_status", id: v.id })
                          }
                        >
                          {v.status === "active"
                            ? t("غیرفعال کردن", "Disable", "تعطيل")
                            : t("فعال کردن", "Enable", "تفعيل")}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          onClick={() => mutation.mutate({ type: "delete_voucher", id: v.id })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
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
