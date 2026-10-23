import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { downloadCsv } from "@/lib/csv";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "تأمین‌کنندگان | کافه‌کاست" },
      {
        name: "description",
        content: "مدیریت تأمین‌کنندگان مواد اولیه کافه و اطلاعات تماس آن‌ها.",
      },
      { property: "og:title", content: "تأمین‌کنندگان | کافه‌کاست" },
      { property: "og:description", content: "مدیریت تأمین‌کنندگان مواد اولیه کافه." },
    ],
  }),
  component: () => (
    <FeatureGuard feature="suppliers">
      <SuppliersPage />
    </FeatureGuard>
  ),
});

const empty = { name: "", phone: "", contact_person: "", address: "", notes: "" };

function SuppliersPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: rows = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("suppliers").insert(form).select().single();
      if (error) throw error;
      await logAudit("create", "suppliers", data.id, { name: form.name });
    },
    onSuccess: () => {
      toast.success("تأمین‌کننده ثبت شد");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "suppliers", id);
    },
    onSuccess: () => {
      toast.success("حذف شد");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="تأمین‌کنندگان"
        description="فهرست فروشندگان و اطلاعات تماس"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("suppliers.csv", rows as never)}>
              <Download className="size-4" />
              خروجی CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  تأمین‌کننده جدید
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تأمین‌کننده جدید</DialogTitle>
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
                    <Label>شماره تماس</Label>
                    <Input
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نام رابط</Label>
                    <Input
                      value={form.contact_person}
                      onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>آدرس</Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>
                    ثبت
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>رابط</TableHead>
                <TableHead>تماس</TableHead>
                <TableHead>آدرس</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    تأمین‌کننده‌ای ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.contact_person || "-"}</TableCell>
                    <TableCell dir="ltr">{r.phone || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.address || "-"}</TableCell>
                    <TableCell>
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
        </CardContent>
      </Card>
    </>
  );
}
