import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, Upload, History, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
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
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { baseUnitPrice } from "@/lib/costing";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUPS,
  ingredientGroupLabel,
  type IngredientGroup,
} from "@/lib/ingredient-groups";
import {
  BASE_UNIT_LABELS,
  BASE_UNIT_OF_CATEGORY,
  CATEGORY_LABELS,
  UNIT_LABELS,
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

export const Route = createFileRoute("/_authenticated/ingredients")({
  head: () => ({
    meta: [
      { title: "مواد اولیه | کافه‌کاست" },
      {
        name: "description",
        content: "مدیریت مواد اولیه، واحد خرید، ضریب تبدیل و قیمت هر واحد پایه.",
      },
      { property: "og:title", content: "مواد اولیه | کافه‌کاست" },
      { property: "og:description", content: "مدیریت مواد اولیه و قیمت هر واحد پایه." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="ingredients">
      <IngredientsPage />
    </FeatureGuard>
  ),
});

type Form = {
  id: string | null;
  name: string;
  unit_category: UnitCategory;
  ingredient_group: IngredientGroup;
  purchase_unit: Unit;
  conversion_factor: string;
  purchase_price: string;
  min_stock: string;
};

const empty: Form = {
  id: null,
  name: "",
  unit_category: "weight",
  ingredient_group: "other",
  purchase_unit: "kg",
  conversion_factor: "1000",
  purchase_price: "0",
  min_stock: "0",
};

function IngredientsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<"all" | UnitCategory>("all");
  const [groupFilter, setGroupFilter] = useState<"all" | IngredientGroup>("all");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["price-history", historyOf],
    enabled: !!historyOf,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredient_price_history")
        .select("*")
        .eq("ingredient_id", historyOf!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const baseUnit = BASE_UNIT_OF_CATEGORY[form.unit_category];
  const cf = Number(form.conversion_factor) || 0;

  const filteredRows = rows.filter((r) => {
    const cat = (r.unit_category ?? "weight") as UnitCategory;
    if (catFilter !== "all" && cat !== catFilter) return false;
    const grp = (r.ingredient_group ?? "other") as IngredientGroup;
    if (groupFilter !== "all" && grp !== groupFilter) return false;
    if (search.trim() && !r.name.includes(search.trim())) return false;
    return true;
  });
  const previewBasePrice = baseUnitPrice(Number(form.purchase_price) || 0, cf);

  function openNew() {
    setForm(empty);
    setOpen(true);
  }

  function openEdit(r: (typeof rows)[number]) {
    setForm({
      id: r.id,
      name: r.name,
      unit_category: (r.unit_category ?? "weight") as UnitCategory,
      ingredient_group: (r.ingredient_group ?? "other") as IngredientGroup,
      purchase_unit: (r.purchase_unit ?? "kg") as Unit,
      conversion_factor: String(r.conversion_factor ?? 1),
      purchase_price: String(r.last_purchase_price ?? 0),
      min_stock: String(r.min_stock ?? 0),
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("نام ماده اولیه الزامی است");
      if (!isUnitCompatible(form.purchase_unit, form.unit_category)) {
        throw new Error("واحد خرید با دسته‌بندی ماده اولیه سازگار نیست");
      }
      if (cf <= 0) throw new Error("ضریب تبدیل باید بزرگ‌تر از صفر باشد");

      const price = Number(form.purchase_price) || 0;
      const base = baseUnitPrice(price, cf);
      const payload = {
        name: form.name.trim(),
        unit_category: form.unit_category,
        ingredient_group: form.ingredient_group,
        base_unit: baseUnit,
        purchase_unit: form.purchase_unit,
        conversion_factor: cf,
        last_purchase_price: price,
        min_stock: Number(form.min_stock) || 0,
      };

      if (form.id) {
        const { error } = await supabase.from("ingredients").update(payload).eq("id", form.id);
        if (error) throw error;
        await logAudit("update", "ingredients", form.id, { name: payload.name });
        return;
      }

      const { data, error } = await supabase
        .from("ingredients")
        .insert({ ...payload, avg_cost: base, last_cost: base })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit("create", "ingredients", data.id, { name: payload.name });
    },
    onSuccess: () => {
      toast.success("ذخیره شد");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "ingredients", id);
    },
    onSuccess: () => {
      toast.success("حذف شد");
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleImport(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    const payload = parsed
      .filter((r) => r["name"])
      .map((r) => {
        const category = (r["unit_category"] || "weight") as UnitCategory;
        const factor = Number(r["conversion_factor"] || 0) || 1;
        const price = Number(r["purchase_price"] || 0);
        const base = baseUnitPrice(price, factor);
        return {
          name: r["name"]!,
          unit_category: category,
          ingredient_group: (r["ingredient_group"] || "other") as IngredientGroup,
          base_unit: BASE_UNIT_OF_CATEGORY[category],
          purchase_unit: r["purchase_unit"] || BASE_UNIT_OF_CATEGORY[category],
          conversion_factor: factor,
          last_purchase_price: price,
          avg_cost: base,
          last_cost: base,
          min_stock: Number(r["min_stock"] || 0),
        };
      });
    if (!payload.length) {
      toast.error("فایل معتبری یافت نشد");
      return;
    }
    const { error } = await supabase.from("ingredients").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("import", "ingredients", null, { count: payload.length });
    toast.success(`${payload.length} ردیف وارد شد`);
    qc.invalidateQueries({ queryKey: ["ingredients"] });
  }

  return (
    <>
      <PageHeader
        title="مواد اولیه"
        description="همه محاسبات بر مبنای «قیمت هر واحد پایه» انجام می‌شود: قیمت خرید ÷ ضریب تبدیل"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              ورود CSV
            </Button>
            <Button variant="outline" onClick={() => downloadCsv("ingredients.csv", rows as never)}>
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Button onClick={openNew}>
              <Plus className="size-4" />
              ماده اولیه جدید
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "ویرایش ماده اولیه" : "ماده اولیه جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی واحد</Label>
              <Select
                value={form.unit_category}
                onValueChange={(v) => {
                  const category = v as UnitCategory;
                  const unit = unitsForCategory(category)[0]!;
                  setForm({
                    ...form,
                    unit_category: category,
                    purchase_unit: unit,
                    conversion_factor: String(defaultConversionFactor(unit)),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as UnitCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>گروه ماده</Label>
              <Select
                value={form.ingredient_group}
                onValueChange={(v) => setForm({ ...form, ingredient_group: v as IngredientGroup })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {INGREDIENT_GROUP_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>واحد خرید</Label>
              <Select
                value={form.purchase_unit}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    purchase_unit: v as Unit,
                    conversion_factor: isUserDefinedFactor(v)
                      ? form.conversion_factor
                      : String(defaultConversionFactor(v)),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitsForCategory(form.unit_category).map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>واحد پایه</Label>
              <Input value={BASE_UNIT_LABELS[baseUnit]} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>
                ضریب تبدیل (۱ {UNIT_LABELS[form.purchase_unit]} = ? {BASE_UNIT_LABELS[baseUnit]})
              </Label>
              <Input
                type="number"
                step="any"
                value={form.conversion_factor}
                onChange={(e) => setForm({ ...form, conversion_factor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>قیمت خرید هر {UNIT_LABELS[form.purchase_unit]} (ریال)</Label>
              <MoneyInput
                value={form.purchase_price}
                onChange={(raw) => setForm({ ...form, purchase_price: raw })}
              />
            </div>
            <div className="space-y-2">
              <Label>حداقل موجودی</Label>
              <Input
                type="number"
                step="any"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>قیمت هر واحد پایه</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
                {fmtPrice4(previewBasePrice)} / {BASE_UNIT_LABELS[baseUnit]}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
              ثبت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <Input
              placeholder="جستجوی ماده اولیه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select
              value={catFilter}
              onValueChange={(v) => setCatFilter(v as "all" | UnitCategory)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                <SelectItem value="weight">{CATEGORY_LABELS.weight}</SelectItem>
                <SelectItem value="volume">{CATEGORY_LABELS.volume}</SelectItem>
                <SelectItem value="count">{CATEGORY_LABELS.count}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={groupFilter}
              onValueChange={(v) => setGroupFilter(v as "all" | IngredientGroup)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه گروه‌ها</SelectItem>
                {INGREDIENT_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {INGREDIENT_GROUP_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {fmtNum(filteredRows.length)} مورد
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>گروه ماده</TableHead>
                  <TableHead>دسته واحد</TableHead>
                  <TableHead>قیمت خرید</TableHead>
                  <TableHead>واحد خرید</TableHead>
                  <TableHead>واحد پایه</TableHead>
                  <TableHead>ضریب تبدیل</TableHead>
                  <TableHead>قیمت هر واحد پایه</TableHead>
                  <TableHead>میانگین موزون</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground">
                      ماده اولیه‌ای یافت نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{ingredientGroupLabel(r.ingredient_group)}</TableCell>
                      <TableCell>
                        {CATEGORY_LABELS[(r.unit_category ?? "weight") as UnitCategory]}
                      </TableCell>
                      <TableCell>{fmtPrice(Number(r.last_purchase_price))}</TableCell>
                      <TableCell>{UNIT_LABELS[(r.purchase_unit ?? "kg") as Unit]}</TableCell>
                      <TableCell>{BASE_UNIT_LABELS[r.base_unit as BaseUnit]}</TableCell>
                      <TableCell>{fmtNum(Number(r.conversion_factor))}</TableCell>
                      <TableCell className="font-semibold">
                        {fmtPrice4(
                          baseUnitPrice(Number(r.last_purchase_price), Number(r.conversion_factor)),
                        )}
                      </TableCell>
                      <TableCell>{fmtPrice4(Number(r.avg_cost))}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setHistoryOf(r.id)}>
                          <History className="size-4" />
                        </Button>
                        {isAdmin ? (
                          <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تاریخچه خرید و قیمت</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>مقدار</TableHead>
                  <TableHead>واحد خرید</TableHead>
                  <TableHead>قیمت خرید</TableHead>
                  <TableHead>ضریب</TableHead>
                  <TableHead>قیمت واحد پایه</TableHead>
                  <TableHead>میانگین پس از خرید</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      رکوردی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{fmtDate(h.changed_at)}</TableCell>
                      <TableCell>{fmtNum(Number(h.quantity ?? 0))}</TableCell>
                      <TableCell>
                        {h.purchase_unit ? UNIT_LABELS[h.purchase_unit as Unit] : "-"}
                      </TableCell>
                      <TableCell>{fmtPrice(Number(h.purchase_price ?? 0))}</TableCell>
                      <TableCell>{fmtNum4(Number(h.conversion_factor ?? 1))}</TableCell>
                      <TableCell>{fmtPrice4(Number(h.unit_cost))}</TableCell>
                      <TableCell>{fmtPrice4(Number(h.avg_cost_after))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
