import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, Plus, Printer, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { PrinterDevice, PrintJob } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/printers")({
  head: () => ({
    meta: [{ title: "چاپگرها و صف چاپ | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="printers">
      <PrintersPage />
    </FeatureGuard>
  ),
});

function PrintersPage() {
  const { t, formatNumber, formatDateTime } = useI18n();
  const { data: bundle } = useHallyBundle(10000);
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [station, setStation] = useState<PrinterDevice["station"]>("kitchen");
  const [paperWidth, setPaperWidth] = useState<"80" | "58">("80");
  const [copies, setCopies] = useState("1");
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);

  const printers = bundle?.store.printers ?? [];
  const jobs = bundle?.store.print_jobs ?? [];

  async function handleCreatePrinter() {
    if (!name.trim()) {
      toast.error(t("نام چاپگر الزامی است", "Printer name is required", "اسم الطابعة مطلوب"));
      return;
    }
    await mutation.mutateAsync({
      type: "upsert_printer",
      printer: {
        name: name.trim(),
        station,
        paper_width: paperWidth === "58" ? 58 : 80,
        copies: Number(copies) || 1,
      },
    });
    setName("");
    setOpen(false);
    toast.success(t("چاپگر اضافه شد", "Printer added", "تمت إضافة الطابعة"));
  }

  function printInBrowser(job: PrintJob) {
    setPreviewJob(job);
    setTimeout(() => {
      window.print();
    }, 250);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("چاپگرها و صف چاپ فیش", "Printers & Print Queue", "الطابعات وطابور الطباعة")}
        description={t(
          "مدیریت چاپگرهای ایستگاه‌ها (آشپزخانه، بار، صندوق) و صف فیش‌های چاپی سفارش‌ها.",
          "Manage kitchen, bar, and receipt printers and inspect or print queued order chits.",
          "إدارة طابعات المطبخ والبار والكاشير وطابور طباعة الفواتير.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                mutation.mutate({ type: "claim_print_jobs", limit: 20 });
                toast.success(
                  t(
                    "فیش‌های در انتظار دریافت شدند",
                    "Claimed pending jobs",
                    "تم استلام مهام الطباعة",
                  ),
                );
              }}
            >
              <Printer className="size-4" />
              {t("دریافت فیش‌های در صف", "Claim Pending Jobs", "استلام المهام المعلقة")}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("چاپگر جدید", "New Printer", "طابعة جديدة")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("افزودن چاپگر ایستگاه", "Add Station Printer", "إضافة طابعة محطة")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>{t("نام چاپگر", "Printer Name", "اسم الطابعة")}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t(
                        "مثلاً چاپگر بار سرد",
                        "e.g. Cold Bar Printer",
                        "طابعة البار البارد",
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label>{t("ایستگاه", "Station", "المحطة")}</Label>
                      <Select
                        value={station}
                        onValueChange={(v) => setStation(v as PrinterDevice["station"])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen">
                            {t("آشپزخانه", "Kitchen", "المطبخ")}
                          </SelectItem>
                          <SelectItem value="bar">{t("بار", "Bar", "البار")}</SelectItem>
                          <SelectItem value="receipt">
                            {t("صندوق", "Receipt", "الكاشير")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("عرض کاغذ", "Paper Width", "عرض الورق")}</Label>
                      <Select
                        value={paperWidth}
                        onValueChange={(v) => setPaperWidth(v as "80" | "58")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80">80mm</SelectItem>
                          <SelectItem value="58">58mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("تعداد نسخه", "Copies", "النسخ")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={copies}
                        onChange={(e) => setCopies(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreatePrinter}>
                    {t("ذخیره چاپگر", "Save Printer", "حفظ الطابعة")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("چاپگرهای تعریف‌شده", "Configured Printers", "الطابعات المعرفة")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("نام", "Name", "الاسم")}</TableHead>
                  <TableHead>{t("ایستگاه", "Station", "المحطة")}</TableHead>
                  <TableHead>{t("کاغذ / نسخه", "Paper / Copies", "الورق / النسخ")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.station}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatNumber(p.paper_width)}mm × {formatNumber(p.copies)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-200 text-zinc-700"
                        }
                      >
                        {p.status === "active"
                          ? t("فعال", "Active", "نشط")
                          : t("غیرفعال", "Inactive", "غير نشط")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("صف کارهای چاپی (Print Jobs)", "Print Job Queue", "طابور مهام الطباعة")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("هیچ فیشی در صف چاپ نیست.", "Print queue is empty.", "طابور الطباعة فارغ.")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("سفارش", "Order", "الطلب")}</TableHead>
                    <TableHead>{t("چاپگر / ایستگاه", "Printer", "الطابعة")}</TableHead>
                    <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                    <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.slice(0, 25).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-bold">
                        <div>#{formatNumber(job.order_number)}</div>
                        <div className="text-[11px] font-normal text-muted-foreground">
                          {formatDateTime(job.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{job.printer_name}</div>
                        <div className="text-[11px] text-muted-foreground">{job.station}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.status === "delivered"
                              ? "default"
                              : job.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPreviewJob(job)}
                          >
                            <Eye className="size-3.5" />
                            {t("پیش‌نمایش", "Preview", "معاينة")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => printInBrowser(job)}
                          >
                            <Printer className="size-3.5" />
                            {t("چاپ", "Print", "طباعة")}
                          </Button>
                          {job.status !== "delivered" && job.status !== "cancelled" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-emerald-600"
                              onClick={() =>
                                mutation.mutate({
                                  type: "update_print_job_status",
                                  id: job.id,
                                  status: "delivered",
                                })
                              }
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                          {job.status === "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              onClick={() =>
                                mutation.mutate({
                                  type: "update_print_job_status",
                                  id: job.id,
                                  status: "cancelled",
                                })
                              }
                            >
                              <XCircle className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(previewJob)} onOpenChange={(o) => !o && setPreviewJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("پیش‌نمایش فیش چاپی", "Receipt Chit Preview", "معاينة إيصال الطباعة")} #
              {previewJob?.order_number}
            </DialogTitle>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
            {previewJob?.payload}
          </pre>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            {t("چاپ با مرورگر", "Print via Browser", "طباعة عبر المتصفح")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
