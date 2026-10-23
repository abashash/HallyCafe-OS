import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, X, Sparkles, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceImageUpload, type PickedImage } from "@/components/InvoiceImageUpload";
import { MoneyInput } from "@/components/MoneyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { downloadCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";
import { extractInvoice } from "@/lib/ocr.functions";
import { baseUnitPrice } from "@/lib/costing";
import {
  UNIT_LABELS,
  BASE_UNIT_LABELS,
  defaultConversionFactor,
  fmtDate,
  fmtNum,
  fmtNum4,
  fmtPrice,
  fmtPrice4,
  isUnitCompatible,
  isUserDefinedFactor,
  unitsForCategory,
  type BaseUnit,
  type Unit,
  type UnitCategory,
} from "@/lib/units";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "فاکتورهای خرید | کافه‌کاست" },
      {
        name: "description",
        content: "ثبت فاکتور خرید با تصویر و استخراج هوشمند، و به‌روزرسانی خودکار قیمت واحد پایه.",
      },
      { property: "og:title", content: "فاکتورهای خرید | کافه‌کاست" },
      {
        property: "og:description",
        content: "آپلود تصویر فاکتور، استخراج خودکار اقلام و محاسبه قیمت هر واحد پایه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="invoices">
      <Page />
    </FeatureGuard>
  ),
});

type Line = {
  ingredient_id: string;
  quantity: string;
  unit: Unit;
  conversion_factor: string;
  total_price: string;
  ocr_name?: string;
};

const emptyLine: Line = {
  ingredient_id: "",
  quantity: "",
  unit: "kg",
  conversion_factor: "1000",
  total_price: "",
};

const PAYMENT_TYPES: Record<string, string> = {
  cash: "نقدی",
  credit: "نسیه",
  card: "کارت‌خوان",
  transfer: "انتقال بانکی",
};

const PAYMENT_STATUSES: Record<string, string> = {
  paid: "پرداخت‌شده",
  partial: "پرداخت جزئی",
  unpaid: "پرداخت‌نشده",
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyHeader = {
  supplier_id: "",
  invoice_date: today(),
  invoice_number: "",
  notes: "",
  payment_type: "cash",
  payment_status: "paid",
  payment_date: today(),
  due_date: "",
  paid_amount: "",
  vat_amount: "0",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    reader.readAsDataURL(file);
  });
}

function Page() {
  const qc = useQueryClient();
  const runOcr = useServerFn(extractInvoice);
  const [open, setOpen] = useState(false);
  const [detailOf, setDetailOf] = useState<string | null>(null);
  const [header, setHeader] = useState({ ...emptyHeader });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [images, setImages] = useState<PickedImage[]>([]);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, suppliers(name)")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["invoice_items", detailOf],
    enabled: !!detailOf,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*, ingredients(name, base_unit)")
        .eq("invoice_id", detailOf!);
      if (error) throw error;
      return data;
    },
  });

  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  function categoryOf(id: string): UnitCategory {
    const ing = ingMap.get(id);
    return (ing?.unit_category ?? "weight") as UnitCategory;
  }

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const total = lines.reduce((s, l) => s + (Number(l.total_price) || 0), 0);

  const ocr = useMutation({
    mutationFn: async () => {
      if (!images.length) throw new Error("ابتدا تصویر فاکتور را بارگذاری کنید");
      const urls = await Promise.all(images.map((i) => fileToDataUrl(i.file)));
      return runOcr({ data: { images: urls } });
    },
    onSuccess: (res) => {
      const supplier = res.supplier_name
        ? suppliers.find(
            (s) => s.name.includes(res.supplier_name!) || res.supplier_name!.includes(s.name),
          )
        : undefined;
      setHeader((h) => ({
        ...h,
        supplier_id: supplier?.id ?? h.supplier_id,
        invoice_number: res.invoice_number ?? h.invoice_number,
        invoice_date: res.invoice_date ?? h.invoice_date,
        vat_amount: res.vat_amount != null ? String(res.vat_amount) : h.vat_amount,
      }));
      if (res.items.length) {
        setLines(
          res.items.map((it) => {
            const match = ingredients.find(
              (i) => i.name.trim() === it.name.trim() || it.name.includes(i.name),
            );
            const unit = (it.unit || match?.purchase_unit || "kg") as Unit;
            return {
              ingredient_id: match?.id ?? "",
              quantity: String(it.quantity ?? 0),
              unit,
              conversion_factor: String(
                isUserDefinedFactor(unit)
                  ? (match?.conversion_factor ?? 1)
                  : defaultConversionFactor(unit),
              ),
              total_price: String(it.total_price ?? 0),
              ocr_name: it.name,
            };
          }),
        );
      }
      toast.success("اطلاعات فاکتور استخراج شد؛ لطفاً بررسی و اصلاح کنید");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const valid = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0);
      if (valid.length === 0) throw new Error("حداقل یک قلم معتبر وارد کنید");
      for (const l of valid) {
        if (!isUnitCompatible(l.unit, categoryOf(l.ingredient_id))) {
          throw new Error(
            `واحد «${UNIT_LABELS[l.unit]}» با دسته‌بندی ماده اولیه «${ingMap.get(l.ingredient_id)?.name}» سازگار نیست`,
          );
        }
        if (!(Number(l.conversion_factor) > 0))
          throw new Error("ضریب تبدیل باید بزرگ‌تر از صفر باشد");
      }

      const { data: u } = await supabase.auth.getUser();

      const paths: string[] = [];
      for (const img of images) {
        const ext = img.file.name.split(".").pop() ?? "jpg";
        const path = `${u.user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("invoice-images")
          .upload(path, img.file, { upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }

      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          supplier_id: header.supplier_id || null,
          invoice_date: header.invoice_date,
          invoice_number: header.invoice_number || null,
          notes: header.notes || null,
          created_by: u.user?.id ?? null,
          payment_type: header.payment_type,
          payment_status: header.payment_status,
          payment_date: header.payment_status === "unpaid" ? null : header.payment_date || null,
          due_date: header.due_date || null,
          paid_amount: Number(header.paid_amount) || 0,
          vat_amount: Number(header.vat_amount) || 0,
          image_paths: paths,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: e2 } = await supabase.from("invoice_items").insert(
        valid.map((l) => ({
          invoice_id: inv.id,
          ingredient_id: l.ingredient_id,
          quantity: Number(l.quantity),
          unit: l.unit,
          conversion_factor: Number(l.conversion_factor),
          total_price: Number(l.total_price) || 0,
        })),
      );
      if (e2) throw e2;
      await logAudit("create", "invoices", inv.id, { items: valid.length });
    },
    onSuccess: () => {
      toast.success("فاکتور ثبت شد و قیمت هر واحد پایه به‌روزرسانی گردید");
      setOpen(false);
      setHeader({ ...emptyHeader });
      setLines([{ ...emptyLine }]);
      setImages([]);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("invoice_items").delete().eq("invoice_id", id);
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("فاکتور حذف شد");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthTotal = invoices
    .filter((i) => i.invoice_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, i) => s + Number(i.total_amount), 0);

  const unpaidTotal = invoices
    .filter((i) => i.payment_status !== "paid")
    .reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);

  return (
    <>
      <PageHeader
        title="فاکتورهای خرید"
        description="آپلود تصویر فاکتور، استخراج هوشمند اقلام و به‌روزرسانی خودکار قیمت هر واحد پایه"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadCsv("invoices.csv", invoices as never)}
            >
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  فاکتور جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>ثبت فاکتور خرید</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <InvoiceImageUpload images={images} onChange={setImages} />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!images.length || ocr.isPending}
                    onClick={() => ocr.mutate()}
                  >
                    {ocr.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    خواندن هوشمند فاکتور
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>تأمین‌کننده</Label>
                    <Select
                      value={header.supplier_id}
                      onValueChange={(v) => setHeader({ ...header, supplier_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ فاکتور</Label>
                    <JalaliDatePicker
                      value={header.invoice_date}
                      onChange={(iso) => setHeader({ ...header, invoice_date: iso })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>شماره فاکتور</Label>
                    <Input
                      value={header.invoice_number}
                      onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع پرداخت</Label>
                    <Select
                      value={header.payment_type}
                      onValueChange={(v) => setHeader({ ...header, payment_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_TYPES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>وضعیت پرداخت</Label>
                    <Select
                      value={header.payment_status}
                      onValueChange={(v) => setHeader({ ...header, payment_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUSES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ پرداخت‌شده (ریال)</Label>
                    <MoneyInput
                      value={header.paid_amount}
                      onChange={(raw) => setHeader({ ...header, paid_amount: raw })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ پرداخت</Label>
                    <JalaliDatePicker
                      value={header.payment_date}
                      onChange={(iso) => setHeader({ ...header, payment_date: iso })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سررسید (نسیه)</Label>
                    <JalaliDatePicker
                      value={header.due_date}
                      onChange={(iso) => setHeader({ ...header, due_date: iso })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مالیات بر ارزش افزوده (ریال)</Label>
                    <MoneyInput
                      value={header.vat_amount}
                      onChange={(raw) => setHeader({ ...header, vat_amount: raw })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-3">
                    <Label>توضیحات</Label>
                    <Input
                      value={header.notes}
                      onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">اقلام فاکتور (بازبینی و ویرایش)</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLines([...lines, { ...emptyLine }])}
                    >
                      <Plus className="size-4" />
                      افزودن قلم
                    </Button>
                  </div>

                  <div className="max-h-80 space-y-3 overflow-y-auto pl-1">
                    {lines.map((line, idx) => {
                      const ing = ingMap.get(line.ingredient_id);
                      const category = categoryOf(line.ingredient_id);
                      const base = (ing?.base_unit ?? "g") as BaseUnit;
                      const units = unitsForCategory(category);
                      const cf = Number(line.conversion_factor) || 0;
                      const baseQty = (Number(line.quantity) || 0) * cf;
                      const unitCost = baseQty > 0 ? (Number(line.total_price) || 0) / baseQty : 0;
                      return (
                        <div
                          key={idx}
                          className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1.4fr_.7fr_.8fr_.8fr_1fr_auto]"
                        >
                          <div className="space-y-1">
                            <Label className="text-xs">
                              ماده اولیه{line.ocr_name ? ` (${line.ocr_name})` : ""}
                            </Label>
                            <Select
                              value={line.ingredient_id}
                              onValueChange={(v) => {
                                const target = ingMap.get(v);
                                const u = (target?.purchase_unit ??
                                  unitsForCategory(
                                    (target?.unit_category ?? "weight") as UnitCategory,
                                  )[0]!) as Unit;
                                setLine(idx, {
                                  ingredient_id: v,
                                  unit: u,
                                  conversion_factor: String(
                                    isUserDefinedFactor(u)
                                      ? (target?.conversion_factor ?? 1)
                                      : defaultConversionFactor(u),
                                  ),
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب" />
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
                          <div className="space-y-1">
                            <Label className="text-xs">مقدار</Label>
                            <Input
                              type="number"
                              step="any"
                              value={line.quantity}
                              onChange={(e) => setLine(idx, { quantity: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">واحد خرید</Label>
                            <Select
                              value={line.unit}
                              onValueChange={(v) =>
                                setLine(idx, {
                                  unit: v as Unit,
                                  conversion_factor: isUserDefinedFactor(v)
                                    ? line.conversion_factor
                                    : String(defaultConversionFactor(v)),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {UNIT_LABELS[u]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">ضریب تبدیل</Label>
                            <Input
                              type="number"
                              step="any"
                              value={line.conversion_factor}
                              onChange={(e) => setLine(idx, { conversion_factor: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">مبلغ کل (ریال)</Label>
                            <MoneyInput
                              value={line.total_price}
                              onChange={(raw) => setLine(idx, { total_price: raw })}
                            />
                            {unitCost > 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                هر {BASE_UNIT_LABELS[base]}: {fmtPrice4(unitCost)} (
                                {fmtNum(baseQty)} {BASE_UNIT_LABELS[base]})
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm font-semibold">جمع فاکتور: {fmtPrice(total)}</p>
                </div>

                <DialogFooter>
                  <Button onClick={() => create.mutate()} disabled={create.isPending}>
                    ثبت فاکتور
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">تعداد فاکتورها</p>
            <p className="pt-1 text-2xl font-bold">{fmtNum(invoices.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">خرید ماه جاری</p>
            <p className="pt-1 text-2xl font-bold">{fmtPrice(monthTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">جمع کل خریدها</p>
            <p className="pt-1 text-2xl font-bold">
              {fmtPrice(invoices.reduce((s, i) => s + Number(i.total_amount), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">مانده بدهی</p>
            <p className="pt-1 text-2xl font-bold">{fmtPrice(unpaidTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>شماره</TableHead>
                  <TableHead>تأمین‌کننده</TableHead>
                  <TableHead>نوع پرداخت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      هنوز فاکتوری ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{fmtDate(inv.invoice_date)}</TableCell>
                    <TableCell>{inv.invoice_number ?? "-"}</TableCell>
                    <TableCell>
                      {(inv as { suppliers?: { name: string } | null }).suppliers?.name ?? "-"}
                    </TableCell>
                    <TableCell>{PAYMENT_TYPES[inv.payment_type] ?? inv.payment_type}</TableCell>
                    <TableCell>
                      {PAYMENT_STATUSES[inv.payment_status] ?? inv.payment_status}
                    </TableCell>
                    <TableCell>{fmtPrice(Number(inv.total_amount))}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailOf(inv.id)}>
                        اقلام
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(inv.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailOf} onOpenChange={(o) => !o && setDetailOf(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>اقلام فاکتور</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ماده اولیه</TableHead>
                  <TableHead>مقدار</TableHead>
                  <TableHead>واحد خرید</TableHead>
                  <TableHead>ضریب</TableHead>
                  <TableHead>مقدار پایه</TableHead>
                  <TableHead>قیمت واحد پایه</TableHead>
                  <TableHead>مبلغ کل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const rel = it as unknown as {
                    ingredients?: { name: string; base_unit: string } | null;
                  };
                  const base = (rel.ingredients?.base_unit ?? "g") as BaseUnit;
                  return (
                    <TableRow key={it.id}>
                      <TableCell>{rel.ingredients?.name ?? "-"}</TableCell>
                      <TableCell>{fmtNum(Number(it.quantity))}</TableCell>
                      <TableCell>{UNIT_LABELS[it.unit as Unit] ?? it.unit}</TableCell>
                      <TableCell>{fmtNum4(Number(it.conversion_factor))}</TableCell>
                      <TableCell>
                        {fmtNum(Number(it.base_quantity))} {BASE_UNIT_LABELS[base]}
                      </TableCell>
                      <TableCell>
                        {fmtPrice4(
                          Number(it.base_unit_price) ||
                            baseUnitPrice(Number(it.total_price), Number(it.base_quantity)),
                        )}
                      </TableCell>
                      <TableCell>{fmtPrice(Number(it.total_price))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
