import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Download, Trash2, TrendingDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { fmtDate, fmtPercent, fmtPrice } from "@/lib/units";
import {
  recipeCost,
  profitMargin,
  LOW_MARGIN_THRESHOLD,
  type IngredientLite,
  type RecipeLine,
} from "@/lib/costing";
import { logAudit } from "@/lib/audit";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "هشدارها | کافه‌کاست" },
      {
        name: "description",
        content: "هشدارهای افزایش قیمت مواد اولیه و آیتم‌های با حاشیه سود پایین.",
      },
      { property: "og:title", content: "هشدارها | کافه‌کاست" },
      {
        property: "og:description",
        content: "هشدارهای افزایش قیمت مواد اولیه و آیتم‌های با حاشیه سود پایین.",
      },
    ],
  }),
  component: () => (
    <FeatureGuard feature="alerts">
      <AlertsPage />
    </FeatureGuard>
  ),
});

const SEVERITY: Record<string, { label: string; variant: "destructive" | "secondary" }> = {
  critical: { label: "بحرانی", variant: "destructive" },
  warning: { label: "هشدار", variant: "secondary" },
};

function AlertsPage() {
  const qc = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const { data: menuItems = [] } = useQuery({
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

  const { data: recipeItems = [] } = useQuery({
    queryKey: ["recipe_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipe_items").select("*");
      if (error) throw error;
      return data as RecipeLine[];
    },
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id,name,avg_cost,base_unit");
      if (error) throw error;
      return data as IngredientLite[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
      await logAudit("update", "alerts", null, { action: "mark_all_read" });
    },
    onSuccess: () => {
      toast.success("همه هشدارها خوانده شد");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("حذف شد");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = useMemo(
    () => (onlyUnread ? alerts.filter((a) => !a.is_read) : alerts),
    [alerts, onlyUnread],
  );
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const lowMargin = useMemo(() => {
    const byItem = new Map<string, RecipeLine[]>();
    for (const l of recipeItems) {
      byItem.set(l.menu_item_id, [...(byItem.get(l.menu_item_id) ?? []), l]);
    }
    return menuItems
      .filter((m) => m.is_active)
      .map((m) => {
        const cost = recipeCost(byItem.get(m.id) ?? [], ingredients);
        const price = Number(m.selling_price);
        return { id: m.id, name: m.name, price, cost, margin: profitMargin(price, cost) };
      })
      .filter((r) => r.price > 0 && r.margin < LOW_MARGIN_THRESHOLD)
      .sort((a, b) => a.margin - b.margin);
  }, [menuItems, recipeItems, ingredients]);

  return (
    <>
      <PageHeader
        title="هشدارها"
        description="افزایش قیمت مواد اولیه و آیتم‌های منو با حاشیه سود پایین"
        actions={
          <>
            <Button variant="outline" onClick={() => setOnlyUnread((v) => !v)}>
              {onlyUnread ? "نمایش همه" : "فقط خوانده‌نشده‌ها"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "alerts.csv",
                  alerts.map((a) => ({
                    تاریخ: fmtDate(a.created_at),
                    نوع: a.type,
                    شدت: SEVERITY[a.severity]?.label ?? a.severity,
                    پیام: a.message,
                    خوانده‌شده: a.is_read ? "بله" : "خیر",
                  })),
                )
              }
            >
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Button onClick={() => markAllRead.mutate()} disabled={unreadCount === 0}>
              <Check className="size-4" />
              خواندن همه
            </Button>
          </>
        }
      />

      <Tabs defaultValue="price">
        <TabsList className="mb-4">
          <TabsTrigger value="price">
            افزایش قیمت{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="margin">
            حاشیه سود پایین{lowMargin.length > 0 ? ` (${lowMargin.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-destructive" />
                هشدار افزایش قیمت مواد اولیه
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>شدت</TableHead>
                    <TableHead>پیام</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4}>در حال بارگذاری…</TableCell>
                    </TableRow>
                  ) : shown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        هشداری وجود ندارد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shown.map((a) => (
                      <TableRow key={a.id} className={a.is_read ? "opacity-60" : ""}>
                        <TableCell className="whitespace-nowrap">{fmtDate(a.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={SEVERITY[a.severity]?.variant ?? "secondary"}>
                            {SEVERITY[a.severity]?.label ?? a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.message}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!a.is_read ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="خوانده شد"
                                onClick={() => markRead.mutate(a.id)}
                              >
                                <Check className="size-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="حذف"
                              onClick={() => remove.mutate(a.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="size-4 text-destructive" />
                آیتم‌هایی با حاشیه سود کمتر از {LOW_MARGIN_THRESHOLD}٪ (بدون سربار)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>آیتم</TableHead>
                    <TableHead>قیمت فروش</TableHead>
                    <TableHead>بهای مواد اولیه</TableHead>
                    <TableHead>حاشیه سود</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowMargin.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        همه آیتم‌ها حاشیه سود قابل قبولی دارند.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowMargin.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{fmtPrice(r.price)}</TableCell>
                        <TableCell>{fmtPrice(r.cost)}</TableCell>
                        <TableCell className="text-destructive">{fmtPercent(r.margin)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
