import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/MoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { fmtDate, fmtPrice } from "@/lib/units";
import { downloadCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";
import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const EXPENSE_CATEGORIES: Record<string, string> = {
  water: "آب",
  electricity: "برق",
  gas: "گاز",
  rent: "اجاره",
  salary: "حقوق و دستمزد",
  delivery: "پیک و ارسال",
  internet: "اینترنت و تلفن",
  packaging: "بسته‌بندی",
  maintenance: "تعمیر و نگهداری",
  marketing: "تبلیغات",
  insurance: "بیمه",
  cleaning: "نظافت و شوینده",
  tax: "مالیات و عوارض",
  other: "سایر",
};

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "هزینه‌های جاری | کافه‌کاست" },
      {
        name: "description",
        content: "ثبت هزینه‌های جاری کافه مانند آب، برق، گاز، اجاره، حقوق و پیک.",
      },
      { property: "og:title", content: "هزینه‌های جاری | کافه‌کاست" },
      { property: "og:description", content: "ثبت و مدیریت هزینه‌های ثابت و متغیر کافه." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FeatureGuard feature="expenses">
      <Page />
    </FeatureGuard>
  ),
});

const emptyForm = {
  title: "",
  category: "electricity",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  is_monthly: true,
  notes: "",
};

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [] } = useQuery({
    queryKey: ["operating_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operating_expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("operating_expenses").insert({
        title: form.title,
        category: form.category,
        amount: Number(form.amount) || 0,
        expense_date: form.expense_date,
        is_monthly: form.is_monthly,
        notes: form.notes || null,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit("create", "operating_expenses", null, { title: form.title });
    },
    onSuccess: () => {
      toast.success("هزینه ثبت شد");
      setForm(emptyForm);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["operating_expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    title: string;
    category: string;
    amount: number | string;
    expense_date: string;
    is_monthly: boolean;
    notes: string | null;
  } | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  function openEdit(r: {
    id: string;
    title: string;
    category: string;
    amount: number | string;
    expense_date: string;
    is_monthly: boolean;
    notes: string | null;
  }) {
    setEditingExpense(r);
    setEditForm({
      title: r.title,
      category: r.category,
      amount: String(r.amount),
      expense_date: r.expense_date,
      is_monthly: r.is_monthly,
      notes: r.notes || "",
    });
  }

  const update = useMutation({
    mutationFn: async () => {
      if (!editingExpense) return;
      const { error } = await supabase
        .from("operating_expenses")
        .update({
          title: editForm.title.trim(),
          category: editForm.category,
          amount: Number(editForm.amount) || 0,
          expense_date: editForm.expense_date,
          is_monthly: editForm.is_monthly,
          notes: editForm.notes || null,
        })
        .eq("id", editingExpense.id);
      if (error) throw error;
      await logAudit("update", "operating_expenses", editingExpense.id, { title: editForm.title });
    },
    onSuccess: () => {
      toast.success("هزینه با موفقیت ویرایش شد");
      setEditingExpense(null);
      qc.invalidateQueries({ queryKey: ["operating_expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operating_expenses").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "operating_expenses", id);
    },
    onSuccess: () => {
      toast.success("هزینه حذف شد");
      qc.invalidateQueries({ queryKey: ["operating_expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthlyTotal = rows.filter((r) => r.is_monthly).reduce((s, r) => s + Number(r.amount), 0);
  const oneOffTotal = rows.filter((r) => !r.is_monthly).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <PageHeader
        title="هزینه‌های جاری"
        description="آب، برق، گاز، اجاره، حقوق، پیک و سایر هزینه‌ها؛ مبنای محاسبه نقطه سر به سر."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("expenses.csv", rows as never)}>
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  هزینه جدید
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ثبت هزینه</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>عنوان</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>دسته</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ (ریال)</Label>
                    <MoneyInput
                      value={form.amount}
                      onChange={(raw) => setForm({ ...form, amount: raw })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ</Label>
                    <JalaliDatePicker
                      value={form.expense_date}
                      onChange={(iso) => setForm({ ...form, expense_date: iso })}
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Switch
                      checked={form.is_monthly}
                      onCheckedChange={(v) => setForm({ ...form, is_monthly: v })}
                    />
                    <Label>هزینه ثابت ماهانه است</Label>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>توضیحات</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={!form.title || create.isPending}
                  >
                    ثبت
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">مجموع هزینه‌های ثابت ماهانه</p>
            <p className="mt-1 text-2xl font-bold">{fmtPrice(monthlyTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">مجموع هزینه‌های موردی</p>
            <p className="mt-1 text-2xl font-bold">{fmtPrice(oneOffTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان</TableHead>
                  <TableHead>دسته</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      هزینه‌ای ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{EXPENSE_CATEGORIES[r.category] ?? r.category}</TableCell>
                      <TableCell>{fmtPrice(Number(r.amount))}</TableCell>
                      <TableCell>{fmtDate(r.expense_date)}</TableCell>
                      <TableCell>{r.is_monthly ? "ثابت ماهانه" : "موردی"}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(r)}
                            aria-label="ویرایش"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove.mutate(r.id)}
                            aria-label="حذف"
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
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog
        open={Boolean(editingExpense)}
        onOpenChange={(isOpen) => !isOpen && setEditingExpense(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش هزینه جاری</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label>عنوان هزینه</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="مثلاً قبض برق دوره گذشته"
              />
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مبلغ (ریال)</Label>
              <MoneyInput
                value={editForm.amount}
                onChange={(raw) => setEditForm({ ...editForm, amount: raw })}
              />
            </div>
            <div className="space-y-2">
              <Label>تاریخ ثبت</Label>
              <JalaliDatePicker
                value={editForm.expense_date}
                onChange={(iso) => setEditForm({ ...editForm, expense_date: iso })}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={editForm.is_monthly}
                onCheckedChange={(v) => setEditForm({ ...editForm, is_monthly: v })}
              />
              <Label>هزینه ثابت ماهانه است</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="توضیحات تکمیلی یا شماره فیش پرداخت..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => update.mutate()} disabled={!editForm.title || update.isPending}>
              ذخیره تغییرات هزینه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
