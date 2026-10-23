import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { downloadCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/units";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "گزارش فعالیت | کافه‌کاست" },
      { name: "description", content: "تاریخچه تغییرات و فعالیت‌های ثبت‌شده در سامانه کافه." },
      { property: "og:title", content: "گزارش فعالیت | کافه‌کاست" },
      {
        property: "og:description",
        content: "تاریخچه تغییرات و فعالیت‌های ثبت‌شده در سامانه کافه.",
      },
    ],
  }),
  component: () => (
    <FeatureGuard feature="audit">
      <AuditPage />
    </FeatureGuard>
  ),
});

const ACTION_LABELS: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  import: "ورود اطلاعات",
  export: "خروجی",
};

const ENTITY_LABELS: Record<string, string> = {
  categories: "دسته‌بندی‌ها",
  ingredients: "مواد اولیه",
  suppliers: "تأمین‌کنندگان",
  invoices: "فاکتورهای خرید",
  invoice_items: "اقلام فاکتور",
  menu_items: "آیتم‌های منو",
  recipe_items: "رسپی",
  operating_expenses: "هزینه‌های سربار",
  monthly_sales: "فروش ماهانه",
  alerts: "هشدارها",
};

function AuditPage() {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const entities = useMemo(() => Array.from(new Set(rows.map((r) => r.entity))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (entity !== "all" && r.entity !== entity) return false;
        if (action !== "all" && r.action !== action) return false;
        if (q) {
          const hay = `${r.user_email ?? ""} ${r.entity} ${r.action} ${JSON.stringify(r.details ?? "")}`;
          if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [rows, entity, action, q],
  );

  return (
    <>
      <PageHeader
        title="گزارش فعالیت"
        description="تاریخچه ثبت، ویرایش و حذف اطلاعات در سامانه"
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "audit-log.csv",
                filtered.map((r) => ({
                  تاریخ: fmtDate(r.created_at),
                  کاربر: r.user_email ?? "-",
                  عملیات: ACTION_LABELS[r.action] ?? r.action,
                  بخش: ENTITY_LABELS[r.entity] ?? r.entity,
                  جزئیات: r.details ? JSON.stringify(r.details) : "",
                })),
              )
            }
          >
            <Download className="size-4" />
            خروجی CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="w-56"
          placeholder="جستجو…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="بخش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه بخش‌ها</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e} value={e}>
                {ENTITY_LABELS[e] ?? e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="عملیات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه عملیات</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>بخش</TableHead>
                <TableHead>جزئیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>در حال بارگذاری…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    فعالیتی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.user_email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={r.action === "delete" ? "destructive" : "secondary"}>
                        {ACTION_LABELS[r.action] ?? r.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{ENTITY_LABELS[r.entity] ?? r.entity}</TableCell>
                    <TableCell className="max-w-[28rem] truncate text-xs text-muted-foreground">
                      {r.details ? JSON.stringify(r.details) : "-"}
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
