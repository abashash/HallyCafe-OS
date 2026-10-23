import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Layers, PackagePlus, Plus, Scale, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { InventoryMovementType } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [{ title: "دفتر کل انبار و موجودی | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="inventory">
      <InventoryPage />
    </FeatureGuard>
  ),
});

function InventoryPage() {
  const { t, dir, formatMoney, formatNumber, formatDate, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [opOpen, setOpOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState("");
  const [opType, setOpType] = useState<InventoryMovementType>("receipt");
  const [opQty, setOpQty] = useState("");
  const [opReason, setOpReason] = useState("");

  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchExpiry, setBatchExpiry] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: ingredients = [] } = useQuery({
    queryKey: ["inventory_ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id,name,base_unit,stock_qty,min_stock,avg_cost")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const movements = bundle?.store.inventory_movements ?? [];
  const batches = bundle?.store.inventory_batches ?? [];

  const lowStockCount = ingredients.filter(
    (i) => Number(i.stock_qty) <= Number(i.min_stock),
  ).length;
  const negativeStockCount = ingredients.filter((i) => Number(i.stock_qty) < 0).length;
  const totalValue = ingredients.reduce(
    (sum, i) => sum + Math.max(0, Number(i.stock_qty)) * Number(i.avg_cost),
    0,
  );

  async function handleRecordMovement() {
    const ing = ingredients.find((i) => i.id === selectedIngId);
    const val = Number(opQty);
    if (!ing || !Number.isFinite(val)) {
      toast.error(
        t(
          "ماده اولیه و مقدار معتبر وارد کنید",
          "Select ingredient and valid quantity",
          "اختر المادة والكمية",
        ),
      );
      return;
    }

    const currentStock = Number(ing.stock_qty) || 0;
    let delta = val;
    let nextStock = currentStock;

    if (opType === "receipt") {
      delta = Math.abs(val);
      nextStock = currentStock + delta;
    } else if (opType === "waste") {
      delta = -Math.abs(val);
      nextStock = currentStock + delta;
    } else if (opType === "count") {
      // Physical count sets exact stock and records variance
      nextStock = val;
      delta = nextStock - currentStock;
    } else {
      delta = val;
      nextStock = currentStock + delta;
    }

    const { error } = await supabase
      .from("ingredients")
      .update({ stock_qty: nextStock })
      .eq("id", ing.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await mutation.mutateAsync({
      type: "record_inventory_movement",
      movement: {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        type: opType,
        quantity: delta,
        unit: ing.base_unit,
        balance_after: nextStock,
        source: t("ثبت دستی انبار", "Manual Inventory Op", "إدخال يدوي"),
        reason: opReason.trim() || opType,
      },
    });

    await queryClient.invalidateQueries({ queryKey: ["inventory_ingredients"] });
    await queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    setOpQty("");
    setOpReason("");
    setOpOpen(false);
    toast.success(
      t(
        "حرکت انبار ثبت شد و موجودی به‌روزرسانی گردید",
        "Stock movement recorded and balance updated",
        "تم تسجيل حركة المخزون وتحديث الرصيد",
      ),
    );
  }

  async function handleCreateBatch() {
    const ing = ingredients.find((i) => i.id === selectedIngId);
    if (!ing || !batchNumber.trim()) {
      toast.error(
        t(
          "ماده اولیه و شماره دسته الزامی است",
          "Ingredient and batch number required",
          "المادة ورقم الدفعة مطلوبان",
        ),
      );
      return;
    }
    await mutation.mutateAsync({
      type: "upsert_inventory_batch",
      batch: {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        batch_number: batchNumber.trim(),
        quantity: Number(batchQty) || 0,
        unit: ing.base_unit,
        cost_per_unit: Number(ing.avg_cost) || 0,
        expires_at: batchExpiry,
        status: "current",
      },
    });
    setBatchNumber("");
    setBatchQty("");
    setBatchExpiry("");
    setBatchOpen(false);
    toast.success(t("دسته انبار ثبت شد", "Batch recorded", "تم تسجيل الدفعة"));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "دفتر کل انبار، حرکات و دسته‌ها",
          "Inventory Ledger, Movements & Batches",
          "سجل المخزون والحركات والدفعات",
        )}
        description={t(
          "کنترل دقیق موجودی، ثبت رسید/ضایعات/شمارش فیزیکی و پیگیری تاریخ انقضای دسته‌ها.",
          "Track stock levels, movement ledger, physical counts, waste, and expiry batches.",
          "تتبع مستويات المخزون وسجل الحركات والجرد الفعلي والهدر وتواريخ الانتهاء.",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Dialog open={opOpen} onOpenChange={setOpOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PackagePlus className="size-4" />
                  {t(
                    "ثبت عملیات انبار (رسید/ضایعات/شمارش)",
                    "Record Stock Operation",
                    "تسجيل عملية مخزون",
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t(
                      "ثبت حرکت در دفتر کل انبار",
                      "Record Inventory Movement",
                      "تسجيل حركة في سجل المخزون",
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>{t("ماده اولیه", "Ingredient", "المادة الأولية")}</Label>
                    <Select value={selectedIngId} onValueChange={setSelectedIngId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("انتخاب ماده اولیه…", "Select…", "اختر…")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.stock_qty} {i.base_unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("نوع عملیات", "Operation Type", "نوع العملية")}</Label>
                      <Select
                        value={opType}
                        onValueChange={(v) => setOpType(v as InventoryMovementType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receipt">
                            {t("رسید ورود بار (+)", "Receipt (+)", "استلام (+)")}
                          </SelectItem>
                          <SelectItem value="waste">
                            {t("ثبت ضایعات (-)", "Waste (-)", "هدر (-)")}
                          </SelectItem>
                          <SelectItem value="count">
                            {t(
                              "شمارش فیزیکی (تنظیم موجودی دقیق)",
                              "Physical Count (Exact)",
                              "جرد فعلي",
                            )}
                          </SelectItem>
                          <SelectItem value="adjustment">
                            {t("تعدیل (+/-)", "Adjustment (+/-)", "تعديل (+/-)")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("مقدار (واحد پایه)", "Quantity (Base Unit)", "الكمية")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={opQty}
                        onChange={(e) => setOpQty(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("توضیح / علت", "Reason / Note", "السبب / ملاحظة")}</Label>
                    <Input value={opReason} onChange={(e) => setOpReason(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleRecordMovement}>
                    {t("ثبت و بروزرسانی موجودی", "Record & Update Stock", "حفظ وتحديث المخزون")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="size-4" />
                  {t("ثبت دسته و تاریخ انقضا", "New Expiry Batch", "دفعة وتاريخ انتهاء")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("ثبت دسته جدید", "Add Inventory Batch", "إضافة دفعة مخزون")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>{t("ماده اولیه", "Ingredient", "المادة الأولية")}</Label>
                    <Select value={selectedIngId} onValueChange={setSelectedIngId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("انتخاب…", "Select…", "اختر…")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("شماره دسته (Batch #)", "Batch Code", "رقم الدفعة")}</Label>
                      <Input
                        dir="ltr"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="LOT-2026-01"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("مقدار", "Quantity", "الكمية")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={batchQty}
                        onChange={(e) => setBatchQty(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t("تاریخ انقضا (شمسی)", "Expiry Date (Jalali)", "تاريخ الانتهاء")}
                    </Label>
                    <JalaliDatePicker value={batchExpiry} onChange={setBatchExpiry} />
                  </div>
                  <Button className="w-full" onClick={handleCreateBatch}>
                    {t("ذخیره دسته", "Save Batch", "حفظ الدفعة")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("ارزش کل موجودی انبار", "Total Stock Value", "إجمالي قيمة المخزون")}
              </p>
              <p className="mt-1 text-xl font-black text-primary">{formatMoney(totalValue)}</p>
            </div>
            <Layers className="size-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("اقلام کمتر از نقطه سفارش", "Below Reorder Point", "أقل من نقطة إعادة الطلب")}
              </p>
              <p className="mt-1 text-xl font-black text-amber-600">
                {formatNumber(lowStockCount)}
              </p>
            </div>
            <AlertTriangle className="size-8 text-amber-500/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("موجودی منفی (نیازمند مغایرت‌گیری)", "Negative Stock Items", "مخزون سالب")}
              </p>
              <p className="mt-1 text-xl font-black text-destructive">
                {formatNumber(negativeStockCount)}
              </p>
            </div>
            <Scale className="size-8 text-destructive/40" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="levels" dir={dir}>
        <TabsList>
          <TabsTrigger value="levels">
            {t("سطح موجودی فعلی", "Stock Levels", "مستويات المخزون")}
          </TabsTrigger>
          <TabsTrigger value="movements">
            {t("دفتر کل حرکات انبار", "Movement Ledger", "سجل الحركات")} (
            {formatNumber(movements.length)})
          </TabsTrigger>
          <TabsTrigger value="batches">
            {t("دسته‌ها و انقضا", "Batches & Expiry", "الدفعات والانتهاء")} (
            {formatNumber(batches.length)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ماده اولیه", "Ingredient", "المادة")}</TableHead>
                    <TableHead>{t("موجودی فعلی", "Current Stock", "المخزون الحالي")}</TableHead>
                    <TableHead>{t("نقطه سفارش", "Min Stock", "الحد الأدنى")}</TableHead>
                    <TableHead>
                      {t("میانگین قیمت پایه", "Avg Base Cost", "متوسط التكلفة")}
                    </TableHead>
                    <TableHead>{t("ارزش موجودی", "Stock Value", "قيمة المخزون")}</TableHead>
                    <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((i) => {
                    const stock = Number(i.stock_qty) || 0;
                    const min = Number(i.min_stock) || 0;
                    const isLow = stock <= min;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-bold">{i.name}</TableCell>
                        <TableCell>
                          <span
                            className={stock < 0 ? "font-bold text-destructive" : "font-medium"}
                          >
                            {formatNumber(stock)} {i.base_unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatNumber(min)} {i.base_unit}
                        </TableCell>
                        <TableCell>{formatMoney(Number(i.avg_cost))}</TableCell>
                        <TableCell className="font-semibold">
                          {formatMoney(Math.max(0, stock) * Number(i.avg_cost))}
                        </TableCell>
                        <TableCell>
                          {stock < 0 ? (
                            <Badge variant="destructive">
                              {t("موجودی منفی", "Negative", "سالب")}
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="secondary" className="text-amber-600">
                              {t("نیاز به شارژ", "Low Stock", "منخفض")}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t("کافی", "OK", "كافٍ")}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t(
                    "هنوز حرکتی در دفتر کل ثبت نشده است.",
                    "No movements recorded yet.",
                    "لا توجد حركات مسجلة.",
                  )}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ماده اولیه", "Ingredient", "المادة")}</TableHead>
                      <TableHead>{t("نوع حرکت", "Type", "النوع")}</TableHead>
                      <TableHead>{t("مقدار تغییر", "Delta", "التغيير")}</TableHead>
                      <TableHead>{t("مانده پس از حرکت", "Balance After", "الرصيد بعد")}</TableHead>
                      <TableHead>{t("منبع / علت", "Source / Reason", "المصدر / السبب")}</TableHead>
                      <TableHead>{t("زمان", "Time", "الوقت")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-bold">{m.ingredient_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.type}</Badge>
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className={`text-start font-bold ${
                            m.quantity >= 0 ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {m.quantity >= 0
                            ? `+${formatNumber(m.quantity)}`
                            : formatNumber(m.quantity)}{" "}
                          {m.unit}
                        </TableCell>
                        <TableCell>
                          {formatNumber(m.balance_after)} {m.unit}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.source} — {m.reason}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              {batches.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("دسته‌ای ثبت نشده است.", "No batches recorded.", "لا توجد دفعات مسجلة.")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ماده اولیه", "Ingredient", "المادة")}</TableHead>
                      <TableHead>{t("شماره دسته", "Batch #", "رقم الدفعة")}</TableHead>
                      <TableHead>{t("موجودی دسته", "Quantity", "الكمية")}</TableHead>
                      <TableHead>{t("تاریخ انقضا", "Expiry Date", "تاريخ الانتهاء")}</TableHead>
                      <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-bold">{b.ingredient_name}</TableCell>
                        <TableCell>
                          <code>{b.batch_number}</code>
                        </TableCell>
                        <TableCell>
                          {formatNumber(b.quantity)} {b.unit}
                        </TableCell>
                        <TableCell dir="ltr" className="text-start">
                          {b.expires_at ? formatDate(b.expires_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            onClick={() =>
                              mutation.mutate({ type: "delete_inventory_batch", id: b.id })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
