import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MoneyInput } from "@/components/MoneyInput";
import { toast } from "sonner";
import { Plus, Trash2, Download, X, ChefHat, Pencil } from "lucide-react";
import { MenuItemDialog, type EditableMenuItem } from "@/components/MenuItemDialog";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  UNIT_LABELS,
  fmtNum,
  fmtPercent,
  fmtPrice,
  isUnitCompatible,
  unitsForBase,
  type BaseUnit,
  type Unit,
} from "@/lib/units";
import {
  breakEvenUnits,
  contributionMargin,
  foodCostPercent,
  ingredientCategory,
  lineCost,
  recipeCost,
  type IngredientLite,
  type RecipeLine,
} from "@/lib/costing";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({
    meta: [
      { title: "آیتم‌های منو و رسپی | کافه‌کاست" },
      {
        name: "description",
        content: "مدیریت آیتم‌های منو، رسپی، بهای تمام‌شده، درصد فودکاست و نقطه سر به سر هر آیتم.",
      },
      { property: "og:title", content: "آیتم‌های منو و رسپی | کافه‌کاست" },
      {
        property: "og:description",
        content: "بهای تمام‌شده، سود ناخالص و نقطه سر به سر هر آیتم منو.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="menu">
      <Page />
    </FeatureGuard>
  ),
});

function PriceInput({ price, onSave }: { price: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(price));
  useEffect(() => setV(String(price)), [price]);
  return (
    <MoneyInput
      className="h-8 w-32"
      value={v}
      onChange={setV}
      onBlur={() => {
        const n = Number(v) || 0;
        if (n !== price) onSave(n);
      }}
    />
  );
}

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditableMenuItem | null>(null);
  const [recipeOf, setRecipeOf] = useState<string | null>(null);
  const [newLine, setNewLine] = useState({ ingredient_id: "", quantity: "", unit: "g" as Unit });

  const { data: menu = [] } = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, categories(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
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

  const { data: recipeItems = [] } = useQuery({
    queryKey: ["recipe_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipe_items").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["operating_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operating_expenses").select("amount,is_monthly");
      if (error) throw error;
      return data;
    },
  });

  const monthlyFixedCost = expenses
    .filter((e) => e.is_monthly)
    .reduce((s, e) => s + Number(e.amount), 0);

  const ingLite: IngredientLite[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    avg_cost: Number(i.avg_cost),
    base_unit: i.base_unit,
    unit_category: i.unit_category,
    purchase_unit: i.purchase_unit,
    conversion_factor: Number(i.conversion_factor),
  }));

  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ selling_price: price })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu_items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFlag = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "is_published" | "is_featured" | "is_available";
      value: boolean;
    }) => {
      const patch: { is_published?: boolean; is_featured?: boolean; is_available?: boolean } = {};
      patch[field] = value;
      const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu_items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("recipe_items").delete().eq("menu_item_id", id);
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("حذف شد");
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      qc.invalidateQueries({ queryKey: ["recipe_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLine = useMutation({
    mutationFn: async () => {
      if (!recipeOf || !newLine.ingredient_id || !(Number(newLine.quantity) > 0)) {
        throw new Error("ماده اولیه و مقدار را وارد کنید");
      }
      const ing = ingLite.find((i) => i.id === newLine.ingredient_id);
      if (ing && !isUnitCompatible(newLine.unit, ingredientCategory(ing))) {
        throw new Error("واحد انتخاب‌شده با دسته واحد این ماده اولیه سازگار نیست");
      }
      const { error } = await supabase.from("recipe_items").insert({
        menu_item_id: recipeOf,
        ingredient_id: newLine.ingredient_id,

        quantity: Number(newLine.quantity),
        unit: newLine.unit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewLine({ ingredient_id: "", quantity: "", unit: "g" });
      qc.invalidateQueries({ queryKey: ["recipe_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipe_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipe_items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const linesOf = (menuId: string) =>
    recipeItems.filter((r) => r.menu_item_id === menuId) as unknown as RecipeLine[];

  const rows = menu.map((m) => {
    const cost = recipeCost(linesOf(m.id), ingLite);
    const price = Number(m.selling_price);
    const cm = contributionMargin(price, cost);
    return {
      item: m,
      cost,
      price,
      cm,
      fc: foodCostPercent(cost, price),
      be: breakEvenUnits(monthlyFixedCost, cm),
    };
  });

  const avgFc = rows.length
    ? rows.reduce((s, r) => s + r.fc, 0) / rows.filter(() => true).length
    : 0;

  const current = recipeOf ? menu.find((m) => m.id === recipeOf) : null;
  const currentLines = recipeOf ? linesOf(recipeOf) : [];
  const currentCost = recipeCost(currentLines, ingLite);
  const currentPrice = Number(current?.selling_price ?? 0);
  const currentCm = contributionMargin(currentPrice, currentCost);
  const currentBe = breakEvenUnits(monthlyFixedCost, currentCm);

  return (
    <>
      <PageHeader
        title="آیتم‌های منو و رسپی"
        description="رسپی هر آیتم را وارد کنید تا بهای تمام‌شده، درصد فودکاست، سود ناخالص و نقطه سر به سر محاسبه شود."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "menu-costing.csv",
                  rows.map((r) => ({
                    name: r.item.name,
                    selling_price: r.price,
                    cost: r.cost,
                    food_cost_percent: r.fc,
                    gross_profit: r.cm,
                    break_even_units: r.be ?? "",
                  })) as never,
                )
              }
            >
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              آیتم جدید
            </Button>
            <MenuItemDialog
              open={open}
              onOpenChange={setOpen}
              item={editing}
              categories={categories}
            />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">تعداد آیتم‌ها</p>
            <p className="pt-1 text-2xl font-bold">{fmtNum(menu.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">میانگین فودکاست</p>
            <p className="pt-1 text-2xl font-bold">{fmtPercent(avgFc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">هزینه ثابت ماهانه</p>
            <p className="pt-1 text-2xl font-bold">{fmtPrice(monthlyFixedCost)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>آیتم</TableHead>
                  <TableHead>دسته</TableHead>
                  <TableHead>قیمت فروش</TableHead>
                  <TableHead>بهای تمام‌شده</TableHead>
                  <TableHead>فودکاست</TableHead>
                  <TableHead>سود ناخالص</TableHead>
                  <TableHead>نقطه سر به سر (تعداد/ماه)</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      هنوز آیتمی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.item.id}>
                    <TableCell className="font-medium">
                      <div>{r.item.name}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(
                          [
                            ["is_published", "منوی آنلاین"],
                            ["is_featured", "ویژه"],
                            ["is_available", "موجود"],
                          ] as const
                        ).map(([field, label]) => {
                          const isActive = Boolean(r.item[field]);
                          return (
                            <button
                              key={field}
                              type="button"
                              onClick={() =>
                                toggleFlag.mutate({ id: r.item.id, field, value: !isActive })
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                                isActive
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                  : "border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? "bg-white" : "bg-zinc-400"
                                }`}
                              />
                              <span>{label}:</span>
                              <span>{isActive ? "فعال" : "غیرفعال"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(r.item as { categories?: { name: string } | null }).categories?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <PriceInput
                        price={r.price}
                        onSave={(v) => updatePrice.mutate({ id: r.item.id, price: v })}
                      />
                    </TableCell>
                    <TableCell>{fmtPrice(r.cost)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.fc > 35 ? "destructive" : r.fc > 30 ? "secondary" : "default"}
                      >
                        {fmtPercent(r.fc)}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtPrice(r.cm)}</TableCell>
                    <TableCell>{r.be === null ? "—" : fmtNum(Math.ceil(r.be))}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="ویرایش"
                        onClick={() => {
                          setEditing(r.item as EditableMenuItem);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => setRecipeOf(r.item.id)}>
                        <ChefHat className="size-4" />
                        رسپی
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem.mutate(r.item.id)}
                      >
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

      <Dialog open={!!recipeOf} onOpenChange={(o) => !o && setRecipeOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>رسپی {current?.name}</DialogTitle>
          </DialogHeader>

          <div className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1.4fr_.8fr_.8fr_auto]">
            <div className="space-y-1">
              <Label className="text-xs">ماده اولیه</Label>
              <Select
                value={newLine.ingredient_id}
                onValueChange={(v) => {
                  const target = ingMap.get(v);
                  const u = unitsForBase((target?.base_unit ?? "g") as BaseUnit)[0]!;
                  setNewLine({ ...newLine, ingredient_id: v, unit: u });
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
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">واحد</Label>
              <Select
                value={newLine.unit}
                onValueChange={(v) => setNewLine({ ...newLine, unit: v as Unit })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitsForBase(
                    (ingMap.get(newLine.ingredient_id)?.base_unit ?? "g") as BaseUnit,
                  ).map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => addLine.mutate()} disabled={addLine.isPending}>
              <Plus className="size-4" />
              افزودن
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ماده اولیه</TableHead>
                <TableHead>مقدار</TableHead>
                <TableHead>هزینه</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    رسپی خالی است.
                  </TableCell>
                </TableRow>
              )}
              {currentLines.map((l) => {
                const ing = ingLite.find((i) => i.id === l.ingredient_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{ing?.name ?? "-"}</TableCell>
                    <TableCell>
                      {fmtNum(Number(l.quantity))} {UNIT_LABELS[l.unit as Unit] ?? l.unit}
                    </TableCell>
                    <TableCell>{fmtPrice(lineCost(l, ing))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeLine.mutate(l.id)}>
                        <X className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="grid gap-3 rounded-lg bg-muted p-4 sm:grid-cols-2">
            <p className="text-sm">
              بهای تمام‌شده: <span className="font-bold">{fmtPrice(currentCost)}</span>
            </p>
            <p className="text-sm">
              فودکاست:{" "}
              <span className="font-bold">
                {fmtPercent(foodCostPercent(currentCost, currentPrice))}
              </span>
            </p>
            <p className="text-sm">
              سود ناخالص هر واحد: <span className="font-bold">{fmtPrice(currentCm)}</span>
            </p>
            <p className="text-sm">
              نقطه سر به سر:{" "}
              <span className="font-bold">
                {currentBe === null ? "—" : `${fmtNum(Math.ceil(currentBe))} عدد در ماه`}
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
