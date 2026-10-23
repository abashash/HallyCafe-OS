import { createFileRoute } from "@tanstack/react-router";
import { Gift, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [{ title: "کاتالوگ پاداش‌ها | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="rewards">
      <RewardsPage />
    </FeatureGuard>
  ),
});

function RewardsPage() {
  const { t, formatMoney, formatNumber, formatDateTime } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [pointsCost, setPointsCost] = useState("150");
  const [rewardValue, setRewardValue] = useState("1000000");
  const [stock, setStock] = useState("30");
  const [description, setDescription] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");

  const rewards = bundle?.store.rewards ?? [];
  const redemptions = bundle?.store.reward_redemptions ?? [];
  const customers = bundle?.store.customers ?? [];

  async function handleCreate() {
    if (!code.trim() || !title.trim()) {
      toast.error(
        t("کد و عنوان پاداش الزامی است", "Code and title required", "الكود والعنوان مطلوبان"),
      );
      return;
    }
    await mutation.mutateAsync({
      type: "upsert_reward",
      reward: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        points_cost: Number(pointsCost) || 100,
        reward_value: Number(rewardValue) || 0,
        stock: Number(stock) || 10,
        description,
      },
    });
    setCode("");
    setTitle("");
    setDescription("");
    setOpen(false);
    toast.success(t("پاداش جدید ثبت شد", "Reward added", "تمت إضافة المكافأة"));
  }

  async function handleRedeem() {
    if (!selectedCustomerId || !selectedRewardId) {
      toast.error(
        t("مشتری و پاداش را انتخاب کنید", "Select customer and reward", "اختر العميل والمكافأة"),
      );
      return;
    }
    try {
      await mutation.mutateAsync({
        type: "redeem_reward",
        customer_id: selectedCustomerId,
        reward_id: selectedRewardId,
      });
      setRedeemOpen(false);
      toast.success(
        t(
          "پاداش برای مشتری بازخرید شد و امتیاز کسر گردید",
          "Reward redeemed and points deducted",
          "تم استبدال المكافأة وخصم النقاط",
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
          "کاتالوگ پاداش‌ها و بازخرید امتیاز",
          "Rewards Catalog & Redemptions",
          "كتالوج المكافآت واستبدال النقاط",
        )}
        description={t(
          "تعریف جوایز باشگاه مشتریان و ثبت بازخرید امتیاز برای اعضای وفادار.",
          "Manage loyalty rewards catalog and redeem customer points for perks and vouchers.",
          "إدارة مكافآت نادي العملاء واستبدال نقاط الأعضاء.",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Sparkles className="size-4" />
                  {t("استرداد پاداش برای مشتری", "Redeem for Customer", "استبدال مكافأة لعميل")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("بازخرید امتیاز مشتری", "Redeem Customer Points", "استبدال نقاط العميل")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>{t("انتخاب مشتری", "Customer", "العميل")}</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("انتخاب…", "Select…", "اختر…")} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.loyalty_points} {t("امتیاز", "pts", "نقطة")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("انتخاب پاداش", "Reward", "المكافأة")}</Label>
                    <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("انتخاب…", "Select…", "اختر…")} />
                      </SelectTrigger>
                      <SelectContent>
                        {rewards
                          .filter((r) => r.status === "active" && r.stock > 0)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title} ({r.points_cost} {t("امتیاز", "pts", "نقطة")})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleRedeem}>
                    {t("ثبت بازخرید و کسر امتیاز", "Confirm Redemption", "تأكيد الاستبدال")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("پاداش جدید", "New Reward", "مكافأة جديدة")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("تعریف پاداش جدید", "Create Loyalty Reward", "إنشاء مكافأة ولاء")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("کد پاداش", "Code", "الكود")}</Label>
                      <Input
                        dir="ltr"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="FREE-LATTE"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("عنوان پاداش", "Title", "العنوان")}</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label>{t("امتیاز لازم", "Points Cost", "النقاط المطلوبة")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={pointsCost}
                        onChange={(e) => setPointsCost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("ارزش معادل", "Value", "القيمة")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={rewardValue}
                        onChange={(e) => setRewardValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("موجودی", "Stock", "المخزون")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("توضیحات", "Description", "الوصف")}</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreate}>
                    {t("ذخیره پاداش", "Save Reward", "حفظ المكافأة")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {rewards.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="size-5 text-primary" />
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
                <Badge>{formatNumber(r.points_cost)} pts</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">{r.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span>
                  {t("ارزش:", "Value:", "القيمة:")} <strong>{formatMoney(r.reward_value)}</strong>
                </span>
                <span>
                  {t("موجودی:", "Stock:", "المخزون:")} <strong>{formatNumber(r.stock)}</strong> (
                  {formatNumber(r.redeemed_count)} {t("استفاده", "used", "مستخدم")})
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive"
                  onClick={() => mutation.mutate({ type: "delete_reward", id: r.id })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("سوابق بازخرید پاداش‌ها", "Redemption History", "سجل استبدال المكافآت")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {redemptions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t(
                "هنوز پاداشی بازخرید نشده است.",
                "No redemptions recorded yet.",
                "لا توجد عمليات استبدال بعد.",
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("مشتری", "Customer", "العميل")}</TableHead>
                  <TableHead>{t("پاداش", "Reward", "المكافأة")}</TableHead>
                  <TableHead>{t("امتیاز کسرشده", "Points Spent", "النقاط المخصومة")}</TableHead>
                  <TableHead>{t("کد پیگیری", "Tracking Code", "كود التتبع")}</TableHead>
                  <TableHead>{t("زمان", "Date", "التاريخ")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((red) => (
                  <TableRow key={red.id}>
                    <TableCell className="font-bold">{red.customer_name}</TableCell>
                    <TableCell>{red.reward_title}</TableCell>
                    <TableCell className="font-bold text-primary">
                      -{formatNumber(red.points_spent)}
                    </TableCell>
                    <TableCell>
                      <code>{red.tracking_code}</code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(red.created_at)}
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
