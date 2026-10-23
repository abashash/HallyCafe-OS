import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { JALALI_MONTHS, todayJalali, toPersianDigits } from "@/lib/jalali";
import { fmtNum, fmtPercent, fmtPrice } from "@/lib/units";
import { downloadCsv } from "@/lib/csv";
import {
  LOW_MARGIN_THRESHOLD,
  foodCostPercent,
  grossProfit,
  overheadPerUnit,
  profitMargin,
  recipeCost,
  totalUnitCost,
} from "@/lib/costing";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "گزارش بهای تمام‌شده | کافه‌کاست" },
      {
        name: "description",
        content:
          "گزارش بهای مواد اولیه، سهم سربار، بهای تمام‌شده، سود ناخالص و حاشیه سود هر آیتم منو.",
      },
      { property: "og:title", content: "گزارش بهای تمام‌شده | کافه‌کاست" },
      {
        property: "og:description",
        content: "گزارش کامل هزینه و سود آیتم‌های منو بر اساس فروش ماهانه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="reports">
      <Page />
    </FeatureGuard>
  ),
});

function Page() {
  const today = todayJalali();
  const [year, setYear] = useState(String(today.jy));
  const [month, setMonth] = useState(String(today.jm));
  const y = Number(year);
  const m = Number(month);

  const { data } = useQuery({
    queryKey: ["cost-report", y, m],
    queryFn: async () => {
      const [items, recipes, ings, expenses, sales] = await Promise.all([
        supabase.from("menu_items").select("*, categories(name)").order("name"),
        supabase.from("recipe_items").select("*"),
        supabase.from("ingredients").select("*"),
        supabase.from("operating_expenses").select("*"),
        supabase.from("monthly_sales").select("*").eq("year", y).eq("month", m),
      ]);
      if (items.error) throw items.error;
      return {
        items: items.data ?? [],
        recipes: recipes.data ?? [],
        ingredients: ings.data ?? [],
        expenses: expenses.data ?? [],
        sales: sales.data ?? [],
      };
    },
  });

  const monthlyOverhead = (data?.expenses ?? [])
    .filter((e) => e.is_monthly)
    .reduce((s, e) => s + Number(e.amount), 0);

  const salesMap = new Map((data?.sales ?? []).map((s) => [s.menu_item_id, Number(s.quantity)]));
  const totalQty = Array.from(salesMap.values()).reduce((s, v) => s + v, 0);

  const rows = (data?.items ?? []).map((item) => {
    const lines = (data?.recipes ?? []).filter((r) => r.menu_item_id === item.id);
    const material = recipeCost(lines, data?.ingredients ?? []);
    const qty = salesMap.get(item.id) ?? 0;
    const overhead = overheadPerUnit(monthlyOverhead, qty, totalQty);
    const total = totalUnitCost(material, overhead);
    const price = Number(item.selling_price);
    return {
      id: item.id,
      name: item.name,
      category: (item as { categories?: { name?: string } }).categories?.name ?? "-",
      qty,
      material,
      overhead,
      total,
      price,
      fc: foodCostPercent(material, price),
      profit: grossProfit(price, total),
      margin: profitMargin(price, total),
    };
  });

  const lowMargin = rows.filter((r) => r.price > 0 && r.margin < LOW_MARGIN_THRESHOLD);
  const revenue = rows.reduce((s, r) => s + r.price * r.qty, 0);
  const materialTotal = rows.reduce((s, r) => s + r.material * r.qty, 0);
  const netProfit = revenue - materialTotal - monthlyOverhead;

  const years = Array.from({ length: 7 }, (_, i) => today.jy - 3 + i);

  return (
    <>
      <PageHeader
        title="گزارش بهای تمام‌شده"
        description="بهای مواد اولیه، سهم سربار، بهای تمام‌شده، سود ناخالص و حاشیه سود هر آیتم"
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `cost-report-${y}-${m}.csv`,
                rows.map((r) => ({
                  item: r.name,
                  category: r.category,
                  sold: r.qty,
                  material_cost: r.material,
                  overhead_per_unit: r.overhead,
                  total_cost: r.total,
                  selling_price: r.price,
                  gross_profit: r.profit,
                  margin_percent: r.margin,
                })) as never,
              )
            }
          >
            <Download className="size-4" />
            خروجی CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-2">
            <Label>سال</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {toPersianDigits(String(v))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ماه</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JALALI_MONTHS.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">کل فروش ماه (تعداد)</p>
            <p className="text-lg font-bold">{fmtNum(totalQty)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">درآمد ماه</p>
            <p className="text-lg font-bold">{fmtPrice(revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">سربار ماهانه</p>
            <p className="text-lg font-bold">{fmtPrice(monthlyOverhead)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">سود خالص تخمینی</p>
            <p className="text-lg font-bold">{fmtPrice(netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      {lowMargin.length ? (
        <Card className="mb-4 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              هشدار حاشیه سود پایین (کمتر از {fmtPercent(LOW_MARGIN_THRESHOLD)})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {lowMargin.map((r) => (
              <Badge key={r.id} variant="destructive">
                {r.name}: {fmtPercent(r.margin)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>آیتم</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>فروش</TableHead>
                <TableHead>مواد اولیه</TableHead>
                <TableHead>سهم سربار</TableHead>
                <TableHead>بهای تمام‌شده</TableHead>
                <TableHead>قیمت فروش</TableHead>
                <TableHead>سود ناخالص</TableHead>
                <TableHead>حاشیه سود</TableHead>
                <TableHead>فودکاست</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground">
                    هنوز آیتمی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell>{fmtNum(r.qty)}</TableCell>
                    <TableCell>{fmtPrice(r.material)}</TableCell>
                    <TableCell>{fmtPrice(r.overhead)}</TableCell>
                    <TableCell className="font-medium">{fmtPrice(r.total)}</TableCell>
                    <TableCell>{fmtPrice(r.price)}</TableCell>
                    <TableCell>{fmtPrice(r.profit)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.price > 0 && r.margin < LOW_MARGIN_THRESHOLD
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {fmtPercent(r.margin)}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtPercent(r.fc)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
