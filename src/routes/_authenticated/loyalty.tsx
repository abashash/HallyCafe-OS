import { createFileRoute } from "@tanstack/react-router";
import { Save, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { LoyaltyTier } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/loyalty")({
  head: () => ({
    meta: [{ title: "وفاداری و سطوح باشگاه مشتریان | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="loyalty">
      <LoyaltyPage />
    </FeatureGuard>
  ),
});

function LoyaltyPage() {
  const { t, formatNumber, formatDateTime } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    if (bundle?.store.loyalty_tiers) {
      setTiers(bundle.store.loyalty_tiers);
    }
  }, [bundle?.store.loyalty_tiers]);

  const ledger = bundle?.store.loyalty_ledger ?? [];

  function updateTier(index: number, patch: Partial<LoyaltyTier>) {
    setTiers((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function saveLadder() {
    await mutation.mutateAsync({
      type: "save_loyalty_tiers",
      tiers,
    });
    toast.success(
      t(
        "نردبان سطوح وفاداری ذخیره و سطح مشتریان بازمحاسبه شد",
        "Loyalty tiers saved and customer levels re-evaluated",
        "تم حفظ مستويات الولاء وإعادة تقييم مستويات العملاء",
      ),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "برنامه وفاداری و نردبان سطوح",
          "Loyalty Program & Tiers",
          "برنامج الولاء والمستويات",
        )}
        description={t(
          "تنظیم آستانه خرید سطوح برنزی، نقره‌ای، طلایی و پلاتینیوم و مشاهده دفتر کل امتیازات.",
          "Configure minimum spend thresholds for Bronze, Silver, Gold, and Platinum tiers and audit the points ledger.",
          "إعداد حدود الشراء لمستويات البرونز والفضة والذهب والبلاتين وعرض سجل النقاط.",
        )}
        actions={
          <Button onClick={saveLadder} disabled={mutation.isPending}>
            <Save className="size-4" />
            {t("ذخیره سطوح وفاداری", "Save Tiers", "حفظ المستويات")}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-5 text-amber-500" />
            {t("نردبان سطوح باشگاه مشتریان", "Loyalty Tiers Ladder", "سلم مستويات نادي العملاء")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("کلید سطح", "Tier Key", "المفتاح")}</TableHead>
                <TableHead>{t("عنوان فارسی", "Persian Label", "الاسم بالفارسية")}</TableHead>
                <TableHead>{t("عنوان انگلیسی", "English Label", "الاسم بالإنجليزية")}</TableHead>
                <TableHead>
                  {t("حداقل مجموع خرید (ریال)", "Min Total Spend", "الحد الأدنى للمشتريات")}
                </TableHead>
                <TableHead>{t("ضریب امتیاز", "Points Multiplier", "مضاعف النقاط")}</TableHead>
                <TableHead>{t("تخفیف سطح (٪)", "Tier Discount %", "نسبة الخصم %")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier, idx) => (
                <TableRow key={tier.key}>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {tier.key}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={tier.name}
                      onChange={(e) => updateTier(idx, { name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      dir="ltr"
                      value={tier.name_en}
                      onChange={(e) => updateTier(idx, { name_en: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      dir="ltr"
                      value={tier.min_spent}
                      onChange={(e) => updateTier(idx, { min_spent: Number(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.25"
                      dir="ltr"
                      value={tier.points_multiplier}
                      onChange={(e) =>
                        updateTier(idx, { points_multiplier: Number(e.target.value) || 1 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      dir="ltr"
                      value={tier.discount_pct}
                      onChange={(e) =>
                        updateTier(idx, { discount_pct: Number(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t(
              "دفتر کل تراکنش‌های امتیاز (Loyalty Ledger)",
              "Points Transaction Ledger",
              "سجل معاملات النقاط",
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("مشتری", "Customer", "العميل")}</TableHead>
                <TableHead>{t("تغییر امتیاز", "Delta", "التغيير")}</TableHead>
                <TableHead>{t("مانده امتیاز", "Balance After", "الرصيد بعد")}</TableHead>
                <TableHead>{t("نوع", "Reason", "السبب")}</TableHead>
                <TableHead>{t("توضیحات", "Note", "ملاحظة")}</TableHead>
                <TableHead>{t("زمان", "Date", "التاريخ")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-bold">{entry.customer_name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {entry.customer_mobile}
                    </div>
                  </TableCell>
                  <TableCell
                    dir="ltr"
                    className={`text-start font-bold ${
                      entry.delta >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {entry.delta >= 0 ? `+${formatNumber(entry.delta)}` : formatNumber(entry.delta)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatNumber(entry.balance_after)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.reason}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{entry.note}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
