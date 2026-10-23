import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, Pencil, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useI18n } from "@/lib/i18n";
import { FeatureGuard } from "@/components/FeatureDisabledGuard";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "دسته‌بندی‌ها | کافه هالی" },
      { name: "description", content: "مدیریت و ویرایش دسته‌بندی آیتم‌های منوی کافه." },
      { property: "og:title", content: "دسته‌بندی‌ها | کافه هالی" },
      { property: "og:description", content: "مدیریت و ویرایش دسته‌بندی آیتم‌های منوی کافه." },
    ],
  }),
  component: () => (
    <FeatureGuard feature="categories">
      <CategoriesPage />
    </FeatureGuard>
  ),
});

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

function CategoriesPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  // Create state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublished, setIsPublished] = useState(true);

  // Edit state
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editIsPublished, setEditIsPublished] = useState(true);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
  });

  function openEdit(cat: CategoryRow) {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
    setEditSortOrder(String(cat.sort_order ?? 0));
    setEditIsPublished(cat.is_published ?? true);
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_published: isPublished,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit("create", "categories", data.id, { name });
      return data;
    },
    onSuccess: () => {
      toast.success(t("دسته‌بندی با موفقیت ثبت شد", "Category created", "تم إنشاء الفئة بنجاح"));
      setOpen(false);
      setName("");
      setDescription("");
      setSortOrder("0");
      setIsPublished(true);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["public_categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingCategory) return;
      const { data, error } = await supabase
        .from("categories")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          sort_order: Number(editSortOrder) || 0,
          is_published: editIsPublished,
        })
        .eq("id", editingCategory.id)
        .select()
        .single();
      if (error) throw error;
      await logAudit("update", "categories", editingCategory.id, { name: editName });
      return data;
    },
    onSuccess: () => {
      toast.success(t("دسته‌بندی با موفقیت ویرایش شد", "Category updated", "تم تعديل الفئة بنجاح"));
      setEditingCategory(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["public_categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "categories", id);
    },
    onSuccess: () => {
      toast.success(t("دسته‌بندی حذف شد", "Category deleted", "تم حذف الفئة"));
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["public_categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("دسته‌بندی‌های منو", "Menu Categories", "فئات القائمة")}
        description={t(
          "گروه‌بندی، ترتیب و ویرایش دسته‌بندی آیتم‌های منو مانند نوشیدنی گرم، سرد، بار گرم، کیک و دسر.",
          "Organize, sort, and edit menu categories such as Hot Drinks, Cold Drinks, Desserts.",
          "تنظيم وترتيب وتعديل فئات عناصر القائمة مثل المشروبات الساخنة والباردة والحلويات.",
        )}
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("categories.csv", rows as never)}>
              <Download className="size-4" />
              {t("خروجی CSV", "Export CSV", "تصدير CSV")}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("دسته‌بندی جدید", "New Category", "فئة جديدة")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("دسته‌بندی جدید", "New Category", "فئة جديدة")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>{t("نام دسته‌بندی", "Category Name", "اسم الفئة")}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("مثلاً نوشیدنی گرم", "e.g. Hot Drinks", "مثال: مشروبات ساخنة")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("توضیح کوتاه (اختیاری)", "Description (Optional)", "الوصف")}</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t(
                        "توضیحات کوتاه درباره آیتم‌های این بخش",
                        "Short description",
                        "وصف قصير",
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("ترتیب نمایش", "Sort Order", "الترتيب")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("وضعیت انتشار", "Published", "حالة النشر")}</Label>
                      <div className="flex h-10 items-center justify-between rounded-md border px-3">
                        <span className="text-xs">
                          {isPublished
                            ? t("منتشر شده", "Published", "منشور")
                            : t("پیش‌نویس", "Draft", "مسودة")}
                        </span>
                        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
                    {t("ثبت دسته‌بندی", "Save Category", "حفظ الفئة")}
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
                <TableHead>{t("نام دسته‌بندی", "Name", "الاسم")}</TableHead>
                <TableHead>{t("توضیح", "Description", "الوصف")}</TableHead>
                <TableHead className="w-28 text-center">
                  {t("ترتیب نمایش", "Sort Order", "الترتيب")}
                </TableHead>
                <TableHead className="w-28 text-center">
                  {t("وضعیت انتشار", "Published", "النشر")}
                </TableHead>
                <TableHead className="w-32 text-end">
                  {t("عملیات", "Actions", "الإجراءات")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("در حال بارگذاری…", "Loading…", "جاري التحميل…")}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t(
                      "هنوز دسته‌بندی‌ای ثبت نشده است.",
                      "No categories created yet.",
                      "لم يتم إنشاء أي فئة بعد.",
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description || "—"}</TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {r.sort_order ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={r.is_published ? "default" : "secondary"}
                        className={r.is_published ? "bg-emerald-600 text-white" : ""}
                      >
                        {r.is_published
                          ? t("منتشر شده", "Published", "منشور")
                          : t("پیش‌نویس", "Draft", "مسودة")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="size-3.5" />
                          {t("ویرایش", "Edit", "تعديل")}
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => remove.mutate(r.id)}
                            aria-label={t("حذف", "Delete", "حذف")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog
        open={Boolean(editingCategory)}
        onOpenChange={(isOpen) => !isOpen && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ویرایش دسته‌بندی", "Edit Category", "تعديل الفئة")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("نام دسته‌بندی", "Category Name", "اسم الفئة")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("نام دسته‌بندی", "Category Name", "اسم الفئة")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("توضیح کوتاه (اختیاری)", "Description (Optional)", "الوصف")}</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("توضیح دسته‌بندی", "Category description", "وصف الفئة")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("ترتیب نمایش", "Sort Order", "الترتيب")}</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("وضعیت انتشار در منوی آنلاین", "Published in Menu", "النشر في القائمة")}
                </Label>
                <div className="flex h-10 items-center justify-between rounded-md border px-3">
                  <span className="text-xs">
                    {editIsPublished
                      ? t("منتشر شده", "Published", "منشور")
                      : t("پیش‌نویس", "Draft", "مسودة")}
                  </span>
                  <Switch checked={editIsPublished} onCheckedChange={setEditIsPublished} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => update.mutate()} disabled={!editName || update.isPending}>
              {t("ذخیره تغییرات", "Save Changes", "حفظ التغييرات")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
