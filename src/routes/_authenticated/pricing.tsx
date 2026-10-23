import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Check, Plus, Sparkles, Trash2, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { PriceApprovalEvent } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";
import { toBaseQty } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [{ title: "قوانین قیمت‌گذاری و تصویب | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="pricing">
      <PricingPage />
    </FeatureGuard>
  ),
});

function PricingPage() {
  const { t, formatMoney, formatNumber, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [ruleOpen, setRuleOpen] = useState(false);
  const [entityName, setEntityName] = useState("قانون حاشیه سود هدف");
  const [marginType, setMarginType] = useState<"percentage" | "fixed">("percentage");
  const [marginValue, setMarginValue] = useState("65");
  const [roundTo, setRoundTo] = useState("10000");

  const { data: menuWithCost = [] } = useQuery({
    queryKey: ["pricing_menu_with_cost"],
    queryFn: async () => {
      const [{ data: items }, { data: recipes }] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id,name,selling_price,is_active")
          .eq("is_active", true)
          .order("name"),
        supabase.from("recipe_items").select("menu_item_id,quantity,unit,ingredients(avg_cost)"),
      ]);

      const costMap = new Map<string, number>();
      for (const r of recipes ?? []) {
        const ing = r.ingredients as unknown as { avg_cost: number } | null;
        const baseQty = toBaseQty(Number(r.quantity), r.unit);
        const lineCost = baseQty * (Number(ing?.avg_cost) || 0);
        costMap.set(r.menu_item_id, (costMap.get(r.menu_item_id) ?? 0) + lineCost);
      }

      return (items ?? []).map((it) => ({
        ...it,
        recipe_cost: Math.round(costMap.get(it.id) ?? 0),
      }));
    },
  });

  const rules = bundle?.store.pricing_rules ?? [];
  const proposals = bundle?.store.price_proposals ?? [];
  const activeRule = rules[0];

  async function handleAddRule() {
    await mutation.mutateAsync({
      type: "upsert_pricing_rule",
      rule: {
        scope: "global",
        entity_name: entityName.trim() || "قانون حاشیه سود",
        margin_type: marginType,
        margin_value: Number(marginValue) || 60,
        round_to: Number(roundTo) || 10000,
      },
    });
    setRuleOpen(false);
    toast.success(t("قانون قیمت‌گذاری ثبت شد", "Pricing rule saved", "تم حفظ قاعدة التسعير"));
  }

  async function generateSmartProposals() {
    const targetMargin = activeRule?.margin_value ?? 65;
    const roundUnit = activeRule?.round_to ?? 10000;
    let count = 0;

    for (const item of menuWithCost) {
      if (item.recipe_cost <= 0) continue;
      const rawSuggested =
        activeRule?.margin_type === "fixed"
          ? item.recipe_cost + targetMargin
          : item.recipe_cost / Math.max(0.1, 1 - targetMargin / 100);
      const rounded = Math.ceil(rawSuggested / roundUnit) * roundUnit;
      const current = Number(item.selling_price) || 0;

      if (Math.abs(rounded - current) >= roundUnit) {
        const alreadyPending = proposals.some(
          (p) => p.menu_item_id === item.id && p.status === "pending",
        );
        if (!alreadyPending) {
          await mutation.mutateAsync({
            type: "create_price_proposal",
            proposal: {
              menu_item_id: item.id,
              menu_item_name: item.name,
              current_price: current,
              proposed_price: rounded,
              recipe_cost: item.recipe_cost,
              food_cost_pct_before:
                current > 0 ? Math.round((item.recipe_cost / current) * 100) : 0,
              food_cost_pct_after: rounded > 0 ? Math.round((item.recipe_cost / rounded) * 100) : 0,
              reason: `پیشنهاد خودکار بر اساس حاشیه سود ${targetMargin}٪`,
            },
          });
          count += 1;
        }
      }
    }

    if (count > 0) {
      toast.success(
        t(
          `${count} پیشنهاد تغییر قیمت برای تصویب مدیر ایجاد شد`,
          `${count} price proposals generated for approval`,
          `تم إنشاء ${count} مقترحات لتغيير الأسعار`,
        ),
      );
    } else {
      toast.info(
        t(
          "تمامی آیتم‌های دارای رسپی با قانون قیمت‌گذاری فعلی منطبق هستند یا پیشنهاد باز دارند.",
          "All items with recipe costs already match rules or have pending proposals.",
          "جميع العناصر متوافقة حالياً مع قواعد التسعير.",
        ),
      );
    }
  }

  async function decideProposal(prop: PriceApprovalEvent, decision: "approved" | "rejected") {
    try {
      if (decision === "approved") {
        const { error } = await supabase
          .from("menu_items")
          .update({ selling_price: prop.proposed_price })
          .eq("id", prop.menu_item_id);
        if (error) throw error;
      }
      await mutation.mutateAsync({
        type: "decide_price_proposal",
        id: prop.id,
        decision,
      });
      await queryClient.invalidateQueries({ queryKey: ["pricing_menu_with_cost"] });
      await queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      toast.success(
        decision === "approved"
          ? t(
              `قیمت «${prop.menu_item_name}» تصویب و در منو اعمال شد`,
              `Price for "${prop.menu_item_name}" approved and updated`,
              `تم اعتماد وتحديث سعر «${prop.menu_item_name}»`,
            )
          : t("پیشنهاد قیمت رد شد", "Proposal rejected", "تم رفض المقترح"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "قوانین قیمت‌گذاری و تصویب تغییرات قیمت",
          "Pricing Rules & Manager Price Approval",
          "قواعد التسعير واعتماد الأسعار",
        )}
        description={t(
          "تعریف حاشیه سود هدف و گردش‌کار تصویب قیمت‌های پیشنهادی بر اساس بهای تمام‌شده رسپی.",
          "Configure target profit margins and approve or reject recommended menu price updates.",
          "تحديد هوامش الربح المستهدفة واعتماد أو رفض مقترحات تحديث أسعار القائمة.",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={generateSmartProposals}>
              <Sparkles className="size-4" />
              {t(
                "محاسبه پیشنهادهای قیمت از روی رسپی",
                "Generate Smart Proposals",
                "توليد مقترحات الأسعار الذكية",
              )}
            </Button>
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("قانون قیمت‌گذاری جدید", "New Pricing Rule", "قاعدة تسعير جديدة")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("تعریف قانون قیمت‌گذاری", "Create Pricing Rule", "إنشاء قاعدة تسعير")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>{t("عنوان قانون", "Rule Title", "عنوان القاعدة")}</Label>
                    <Input value={entityName} onChange={(e) => setEntityName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("نوع حاشیه سود", "Margin Type", "نوع الهامش")}</Label>
                      <Select
                        value={marginType}
                        onValueChange={(v) => setMarginType(v as "percentage" | "fixed")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            {t("درصدی (٪)", "Percentage (%)", "نسبة مئوية (%)")}
                          </SelectItem>
                          <SelectItem value="fixed">
                            {t("مبلغ ثابت", "Fixed Amount", "مبلغ ثابت")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("مقدار حاشیه سود", "Margin Value", "قيمة الهامش")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={marginValue}
                        onChange={(e) => setMarginValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("گرد کردن قیمت به مضرب", "Round Price To", "تقريب السعر إلى")}</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={roundTo}
                      onChange={(e) => setRoundTo(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddRule}>
                    {t("ذخیره قانون", "Save Rule", "حفظ القاعدة")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeDollarSign className="size-5 text-primary" />
            {t("قوانین فعال قیمت‌گذاری", "Active Pricing Rules", "قواعد التسعير النشطة")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("عنوان قانون", "Rule Name", "اسم القاعدة")}</TableHead>
                <TableHead>{t("نوع حاشیه", "Margin Type", "نوع الهامش")}</TableHead>
                <TableHead>{t("مقدار", "Value", "القيمة")}</TableHead>
                <TableHead>{t("گرد کردن به", "Round To", "التقريب إلى")}</TableHead>
                <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">{r.entity_name}</TableCell>
                  <TableCell>
                    {r.margin_type === "percentage"
                      ? t("درصدی", "Percentage", "نسبة مئوية")
                      : t("مبلغ ثابت", "Fixed", "مبلغ ثابت")}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {r.margin_type === "percentage"
                      ? `${r.margin_value}%`
                      : formatMoney(r.margin_value)}
                  </TableCell>
                  <TableCell>{formatMoney(r.round_to)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      onClick={() => mutation.mutate({ type: "delete_pricing_rule", id: r.id })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
              "صف تصویب تغییرات قیمت توسط مدیر",
              "Manager Price Approval Queue",
              "طابور اعتماد تغييرات الأسعار",
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {proposals.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t(
                "پیشنهاد تغییر قیمتی در صف نیست. روی «محاسبه پیشنهادهای قیمت» کلیک کنید.",
                "No price change proposals yet. Click 'Generate Smart Proposals' above.",
                "لا توجد مقترحات لتغيير الأسعار حالياً.",
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("آیتم منو", "Menu Item", "العنصر")}</TableHead>
                  <TableHead>{t("بهای تمام‌شده رسپی", "Recipe Cost", "تكلفة الوصفة")}</TableHead>
                  <TableHead>{t("قیمت فعلی", "Current Price", "السعر الحالي")}</TableHead>
                  <TableHead>{t("قیمت پیشنهادی", "Proposed Price", "السعر المقترح")}</TableHead>
                  <TableHead>{t("سهم مواد (قبل ← بعد)", "Food Cost %", "نسبة التكلفة")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  <TableHead>{t("تصمیم مدیر", "Decision", "القرار")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.menu_item_name}</TableCell>
                    <TableCell>{formatMoney(p.recipe_cost)}</TableCell>
                    <TableCell>{formatMoney(p.current_price)}</TableCell>
                    <TableCell className="font-extrabold text-primary">
                      {formatMoney(p.proposed_price)}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start text-xs">
                      {formatNumber(p.food_cost_pct_before)}% →{" "}
                      {formatNumber(p.food_cost_pct_after)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "approved"
                            ? "default"
                            : p.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {p.status === "approved"
                          ? t("تصویب شد", "Approved", "معتمد")
                          : p.status === "rejected"
                            ? t("رد شد", "Rejected", "مرفوض")
                            : t("در انتظار تصویب", "Pending", "قيد الانتظار")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" onClick={() => decideProposal(p, "approved")}>
                            <Check className="size-3.5" />
                            {t("تصویب و اعمال", "Approve", "اعتماد")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decideProposal(p, "rejected")}
                          >
                            <X className="size-3.5" />
                            {t("رد", "Reject", "رفض")}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.decided_at ? formatDate(p.decided_at) : "—"}
                        </span>
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
