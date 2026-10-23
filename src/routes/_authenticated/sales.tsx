import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { JALALI_MONTHS, todayJalali, toPersianDigits } from "@/lib/jalali";
import { fmtNum } from "@/lib/units";
import { downloadCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "فروش ماهانه | کافه‌کاست" },
      {
        name: "description",
        content: "ثبت دستی تعداد فروش ماهانه هر آیتم منو برای تخصیص سربار و محاسبه سود.",
      },
      { property: "og:title", content: "فروش ماهانه | کافه‌کاست" },
      { property: "og:description", content: "ثبت تعداد فروش ماهانه آیتم‌های منو." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="sales">
      <Page />
    </FeatureGuard>
  ),
});

function Page() {
  const qc = useQueryClient();
  const today = todayJalali();
  const [year, setYear] = useState(String(today.jy));
  const [month, setMonth] = useState(String(today.jm));
  const [draft, setDraft] = useState<Record<string, string>>({});

  const y = Number(year);
  const m = Number(month);

  const { data: menu = [] } = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,selling_price,is_active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["monthly_sales", y, m],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_sales")
        .select("*")
        .eq("year", y)
        .eq("month", m);
      if (error) throw error;
      return data;
    },
  });

  const saved = new Map(sales.map((s) => [s.menu_item_id, Number(s.quantity)]));

  const save = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(draft)
        .filter(([, v]) => v !== "")
        .map(([menu_item_id, v]) => ({
          menu_item_id,
          year: y,
          month: m,
          quantity: Number(v) || 0,
        }));
      if (rows.length === 0) throw new Error("مقداری برای ذخیره وارد نشده است");
      const { error } = await supabase
        .from("monthly_sales")
        .upsert(rows, { onConflict: "menu_item_id,year,month" });
      if (error) throw error;
      await logAudit("upsert", "monthly_sales", null, { year: y, month: m, count: rows.length });
    },
    onSuccess: () => {
      toast.success("فروش ماهانه ذخیره شد");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["monthly_sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalQty = menu.reduce(
    (s, item) =>
      s + (draft[item.id] !== undefined ? Number(draft[item.id]) || 0 : (saved.get(item.id) ?? 0)),
    0,
  );

  const years = Array.from({ length: 7 }, (_, i) => today.jy - 3 + i);

  return (
    <>
      <PageHeader
        title="فروش ماهانه"
        description="تعداد فروش هر آیتم منو را در ماه انتخاب‌شده وارد کنید؛ مبنای تخصیص سربار است."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `sales-${y}-${m}.csv`,
                  menu.map((item) => ({
                    item: item.name,
                    year: y,
                    month: m,
                    quantity: saved.get(item.id) ?? 0,
                  })) as never,
                )
              }
            >
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="size-4" />
              ذخیره
            </Button>
          </>
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
          <div className="text-sm text-muted-foreground">
            مجموع فروش این ماه: <span className="font-bold">{fmtNum(totalQty)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>آیتم منو</TableHead>
                <TableHead className="w-48">تعداد فروش</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    ابتدا آیتم منو ثبت کنید.
                  </TableCell>
                </TableRow>
              ) : (
                menu.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={draft[item.id] ?? String(saved.get(item.id) ?? "")}
                        onChange={(e) => setDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                        placeholder="۰"
                      />
                    </TableCell>
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
