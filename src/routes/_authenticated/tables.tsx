import { createFileRoute } from "@tanstack/react-router";
import { Archive, Check, Copy, ExternalLink, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { DiningTable } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tables")({
  head: () => ({
    meta: [{ title: "میزها و کد QR | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="tables">
      <TablesPage />
    </FeatureGuard>
  ),
});

function TablesPage() {
  const { t, formatNumber } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("سالن اصلی");
  const [capacity, setCapacity] = useState("4");

  const tables = bundle?.store.tables ?? [];

  const [editingTable, setEditingTable] = useState<DiningTable | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editArea, setEditArea] = useState("سالن اصلی");
  const [editCapacity, setEditCapacity] = useState("4");
  const [editSortOrder, setEditSortOrder] = useState("1");
  const [editStatus, setEditStatus] = useState<"active" | "archived">("active");

  function openEdit(tbl: DiningTable) {
    setEditingTable(tbl);
    setEditName(tbl.name);
    setEditCode(tbl.code);
    setEditArea(tbl.area);
    setEditCapacity(String(tbl.capacity));
    setEditSortOrder(String(tbl.sort_order));
    setEditStatus(tbl.status);
  }

  async function handleUpdate() {
    if (!editingTable) return;
    if (!editName.trim()) {
      toast.error(t("نام میز الزامی است", "Table name is required", "اسم الطاولة مطلوب"));
      return;
    }
    try {
      await mutation.mutateAsync({
        type: "upsert_table",
        table: {
          id: editingTable.id,
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          area: editArea.trim() || "سالن اصلی",
          capacity: Number(editCapacity) || 4,
          sort_order: Number(editSortOrder) || editingTable.sort_order,
          status: editStatus,
        },
      });
      setEditingTable(null);
      toast.success(
        t("میز با موفقیت ویرایش شد", "Table updated successfully", "تم تعديل الطاولة بنجاح"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error(t("نام میز الزامی است", "Table name is required", "اسم الطاولة مطلوب"));
      return;
    }
    try {
      await mutation.mutateAsync({
        type: "upsert_table",
        table: {
          name: name.trim(),
          area: area.trim() || "سالن اصلی",
          capacity: Number(capacity) || 4,
          sort_order: tables.length + 1,
        },
      });
      setName("");
      setOpen(false);
      toast.success(t("میز جدید ایجاد شد", "Table created", "تم إنشاء الطاولة"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function copyQrLink(code: string) {
    const url = `${window.location.origin}/online-menu?table=${encodeURIComponent(code)}`;
    void navigator.clipboard.writeText(url);
    toast.success(
      t("لینک سفارش QR میز کپی شد", "Table QR ordering link copied", "تم نسخ رابط طلب QR للطاولة"),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("میزهای سالن و کد QR", "Dining Tables & QR Ordering", "طاولات الصالة ورموز QR")}
        description={t(
          "مدیریت میزهای کافه؛ هر میز دارای لینک اختصاصی منوی آنلاین است تا مشتری مستقیم از سر میز سفارش دهد.",
          "Manage dining tables with unique QR links so guests can order directly from their table.",
          "إدارة طاولات الصالة مع روابط QR مخصصة للطلب المباشر من الطاولة.",
        )}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                {t("افزودن میز جدید", "Add Table", "إضافة طاولة")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("تعریف میز جدید", "Create Dining Table", "إضافة طاولة جديدة")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>{t("نام میز", "Table Name", "اسم الطاولة")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("مثلاً میز ۶ (تراس)", "e.g. Table 6 (Patio)", "مثال: طاولة 6")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("بخش / سالن", "Area / Zone", "المنطقة / الصالة")}</Label>
                    <Input value={area} onChange={(e) => setArea(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("ظرفیت (نفر)", "Capacity", "السعة")}</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={mutation.isPending}>
                  {t("ثبت میز", "Save Table", "حفظ الطاولة")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("نام میز", "Table Name", "اسم الطاولة")}</TableHead>
                <TableHead>{t("کد یکتا (QR)", "QR Code", "رمز QR")}</TableHead>
                <TableHead>{t("بخش", "Area", "المنطقة")}</TableHead>
                <TableHead>{t("ظرفیت", "Capacity", "السعة")}</TableHead>
                <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                <TableHead>
                  {t("لینک سفارش سر میز", "Table Order Link", "رابط الطلب من الطاولة")}
                </TableHead>
                <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((tbl) => {
                const qrPath = `/online-menu?table=${encodeURIComponent(tbl.code)}`;
                return (
                  <TableRow key={tbl.id}>
                    <TableCell className="font-bold">{tbl.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-bold">
                        {tbl.code}
                      </code>
                    </TableCell>
                    <TableCell>{tbl.area}</TableCell>
                    <TableCell>
                      {formatNumber(tbl.capacity)} {t("نفر", "guests", "أشخاص")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tbl.status === "active"}
                          onCheckedChange={() =>
                            mutation.mutate({ type: "toggle_table_status", id: tbl.id })
                          }
                        />
                        <Badge
                          className={
                            tbl.status === "active"
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }
                        >
                          {tbl.status === "active"
                            ? t("فعال", "Active", "نشط")
                            : t("بایگانی", "Archived", "مؤرشف")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => copyQrLink(tbl.code)}
                        >
                          <QrCode className="size-3.5" />
                          <Copy className="size-3" />
                          {t("کپی لینک QR", "Copy QR Link", "نسخ رابط QR")}
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="size-8">
                          <a href={qrPath} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => openEdit(tbl)}
                        >
                          <Pencil className="size-3.5" />
                          {t("ویرایش", "Edit", "تعديل")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() =>
                            mutation.mutate({ type: "toggle_table_status", id: tbl.id })
                          }
                        >
                          {tbl.status === "active" ? (
                            <>
                              <Archive className="size-3.5" />
                              {t("بایگانی", "Archive", "أرشفة")}
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" />
                              {t("فعال‌سازی", "Restore", "استعادة")}
                            </>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          onClick={() => mutation.mutate({ type: "delete_table", id: tbl.id })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Table Dialog */}
      <Dialog
        open={Boolean(editingTable)}
        onOpenChange={(isOpen) => !isOpen && setEditingTable(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("ویرایش اطلاعات میز", "Edit Table Information", "تعديل بيانات الطاولة")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("نام میز", "Table Name", "اسم الطاولة")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("مثلاً میز ۱ (سالن اصلی)", "Table Name", "اسم الطاولة")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("کد یکتا (QR)", "QR Code", "رمز QR")}</Label>
                <Input
                  dir="ltr"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="T101"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("بخش / سالن", "Area / Zone", "المنطقة / الصالة")}</Label>
                <Input value={editArea} onChange={(e) => setEditArea(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("ظرفیت (نفر)", "Capacity (Guests)", "السعة")}</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("ترتیب نمایش", "Sort Order", "الترتيب")}</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{t("وضعیت فعالیت میز", "Active Status", "حالة النشاط")}</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editStatus === "active"}
                  onCheckedChange={(val) => setEditStatus(val ? "active" : "archived")}
                />
                <Badge variant={editStatus === "active" ? "default" : "secondary"}>
                  {editStatus === "active"
                    ? t("فعال", "Active", "نشط")
                    : t("بایگانی", "Archived", "مؤرشف")}
                </Badge>
              </div>
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={mutation.isPending}>
              {t("ذخیره تغییرات میز", "Save Table Changes", "حفظ تعديلات الطاولة")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
