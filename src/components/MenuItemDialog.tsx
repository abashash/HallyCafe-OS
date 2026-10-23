import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { logAudit } from "@/lib/audit";
import { useBrandingImage } from "@/lib/public-site";
import { parsePriceOptions, type PriceOption } from "@/lib/menu-prices";

export type EditableMenuItem = {
  id: string;
  name: string;
  category_id: string | null;
  selling_price: number;
  description: string | null;
  image_url: string | null;
  price_options: unknown;
};

type OptionDraft = { label: string; price: string };

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: EditableMenuItem | null;
  categories: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data: preview } = useBrandingImage(imagePath);

  useEffect(() => {
    if (!open) return;
    const opts = parsePriceOptions(item?.price_options);
    const primary = opts.find((o) => o.primary);
    setName(item?.name ?? "");
    setCategoryId(item?.category_id ?? "");
    setPrice(item ? String(Number(item.selling_price)) : "");
    setPriceLabel(primary?.label ?? "");
    setDescription(item?.description ?? "");
    setOptions(
      opts.filter((o) => !o.primary).map((o) => ({ label: o.label, price: String(o.price) })),
    );
    setImagePath(item?.image_url ?? null);
  }, [open, item]);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری مجاز است");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حداکثر حجم تصویر ۵ مگابایت است");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `menu/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("public-branding").upload(path, file, {
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setImagePath(path);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("نام آیتم را وارد کنید");
      const extra: PriceOption[] = options
        .filter((o) => o.label.trim() && Number(o.price) > 0)
        .map((o) => ({ label: o.label.trim(), price: Number(o.price) }));
      const price_options = [
        ...(priceLabel.trim()
          ? [{ label: priceLabel.trim(), price: Number(price) || 0, primary: true }]
          : []),
        ...extra,
      ];
      const payload = {
        name: name.trim(),
        category_id: categoryId || null,
        selling_price: Number(price) || 0,
        description: description.trim() || null,
        image_url: imagePath,
        price_options,
      };
      if (item) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", item.id);
        if (error) throw error;
        await logAudit("update", "menu_items", item.id, { name: payload.name });
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
        await logAudit("create", "menu_items", null, { name: payload.name });
      }
    },
    onSuccess: () => {
      toast.success("آیتم منو ذخیره شد");
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      qc.invalidateQueries({ queryKey: ["public_menu_items"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? `ویرایش ${item.name}` : "آیتم جدید منو"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>نام آیتم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>دسته‌بندی</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>توضیحات</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>قیمت‌ها (ریال)</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOptions([...options, { label: "", price: "" }])}
            >
              <Plus className="size-4" />
              قیمت دیگر
            </Button>
          </div>
          <div className="grid grid-cols-[1fr_1fr_2.25rem] gap-2">
            <Input
              placeholder="عنوان (اختیاری، مثلاً کوچک)"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
            />
            <MoneyInput value={price} onChange={setPrice} placeholder="قیمت اصلی" />
            <span />
            {options.map((o, idx) => (
              <OptionRow
                key={idx}
                option={o}
                onChange={(next) => setOptions(options.map((x, i) => (i === idx ? next : x)))}
                onRemove={() => setOptions(options.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            قیمت اصلی مبنای محاسبه فودکاست است؛ قیمت‌های دیگر (مثل بزرگ، دوبل یا همراه با غذا) در
            منوی آنلاین نمایش داده می‌شوند.
          </p>
        </div>

        <div className="space-y-2">
          <Label>تصویر آیتم</Label>
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt={name} className="size-20 rounded-md object-cover" />
            ) : (
              <div className="grid size-20 place-items-center rounded-md bg-muted">
                <ImagePlus className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? "در حال آپلود…" : imagePath ? "تغییر تصویر" : "انتخاب تصویر"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
              {imagePath && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImagePath(null)}>
                  <X className="size-4" />
                  حذف تصویر
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  option,
  onChange,
  onRemove,
}: {
  option: OptionDraft;
  onChange: (o: OptionDraft) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Input
        placeholder="عنوان (مثلاً بزرگ)"
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
      />
      <MoneyInput value={option.price} onChange={(raw) => onChange({ ...option, price: raw })} />
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="حذف قیمت">
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </>
  );
}
