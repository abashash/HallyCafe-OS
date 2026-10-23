import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { OperationalCalendarEvent } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [{ title: "تقویم عملیاتی | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="calendar">
      <CalendarPage />
    </FeatureGuard>
  ),
});

function CalendarPage() {
  const { t, formatDateTime } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] =
    useState<OperationalCalendarEvent["event_type"]>("supplier_delivery");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const events = bundle?.store.calendar_events ?? [];

  async function handleCreate() {
    if (!title.trim()) {
      toast.error(t("عنوان رویداد الزامی است", "Event title is required", "عنوان الحدث مطلوب"));
      return;
    }
    const combinedStartsAt = `${startDate}T${startTime || "10:00"}`;
    await mutation.mutateAsync({
      type: "upsert_calendar_event",
      event: {
        title: title.trim(),
        event_type: eventType,
        starts_at: combinedStartsAt,
        ends_at: combinedStartsAt,
        notes,
      },
    });
    setTitle("");
    setNotes("");
    setOpen(false);
    toast.success(t("رویداد در تقویم ثبت شد", "Event scheduled", "تمت جدولة الحدث"));
  }

  function eventTypeLabel(type: OperationalCalendarEvent["event_type"]) {
    switch (type) {
      case "supplier_delivery":
        return t("تحویل تأمین‌کننده", "Supplier Delivery", "تسليم المورد");
      case "invoice_due":
        return t("سررسید فاکتور", "Invoice Due", "استحقاق الفاتورة");
      case "overhead_due":
        return t("سررسید هزینه ثابت", "Overhead Due", "استحقاق مصروف ثابت");
      case "marketing":
        return t("کمپین بازاریابی", "Marketing", "تسويق");
      case "staff":
        return t("شیفت و امور پرسنل", "Staff & Shift", "مناوبة الموظفين");
      default:
        return t("رویداد عمومی", "Custom Event", "حدث عام");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("تقویم عملیاتی کافه", "Operational Calendar", "التقويم التشغيلي للمقهى")}
        description={t(
          "برنامه‌ریزی تحویل بار تأمین‌کنندگان، سررسید فاکتورها، شمارش انبار و شیفت‌های پرسنل.",
          "Schedule supplier deliveries, invoice due dates, inventory counts, and staff shifts.",
          "جدولة تسليمات الموردين واستحقاق الفواتير وجرد المخزون ومناوبات الموظفين.",
        )}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                {t("رویداد جدید", "New Event", "حدث جديد")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("ثبت رویداد تقویم", "Create Calendar Event", "إضافة حدث للتقويم")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("عنوان رویداد", "Event Title", "عنوان الحدث")}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("نوع رویداد", "Event Type", "نوع الحدث")}</Label>
                    <Select
                      value={eventType}
                      onValueChange={(v) =>
                        setEventType(v as OperationalCalendarEvent["event_type"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier_delivery">
                          {t("تحویل تأمین‌کننده", "Supplier Delivery", "تسليم المورد")}
                        </SelectItem>
                        <SelectItem value="invoice_due">
                          {t("سررسید فاکتور", "Invoice Due", "استحقاق الفاتورة")}
                        </SelectItem>
                        <SelectItem value="overhead_due">
                          {t("سررسید هزینه ثابت", "Overhead Due", "استحقاق مصروف")}
                        </SelectItem>
                        <SelectItem value="staff">
                          {t("نوبت‌بندی پرسنل", "Staff Shift", "مناوبة الموظفين")}
                        </SelectItem>
                        <SelectItem value="marketing">
                          {t("بازاریابی", "Marketing", "تسويق")}
                        </SelectItem>
                        <SelectItem value="custom">{t("سایر", "Custom", "أخرى")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("تاریخ (شمسی)", "Date (Jalali)", "التاريخ (شمسي)")}</Label>
                    <JalaliDatePicker value={startDate} onChange={setStartDate} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("ساعت رویداد", "Event Time", "وقت الحدث")}</Label>
                  <Input
                    type="time"
                    dir="ltr"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("یادداشت", "Notes", "ملاحظات")}</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreate}>
                  {t("ثبت در تقویم", "Save Event", "حفظ الحدث")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant="outline">{eventTypeLabel(ev.event_type)}</Badge>
                  <h3 className="font-bold text-foreground">{ev.title}</h3>
                </div>
                <Badge variant={ev.status === "done" ? "default" : "secondary"}>
                  {ev.status === "done"
                    ? t("انجام شد", "Done", "مكتمل")
                    : t("برنامه‌ریزی شده", "Scheduled", "مجدول")}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="size-4 text-primary" />
                <span dir="ltr">{formatDateTime(ev.starts_at)}</span>
              </div>
              {ev.notes && <p className="text-xs text-muted-foreground">{ev.notes}</p>}
              <div className="flex items-center justify-end gap-1 pt-2">
                {ev.status !== "done" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutation.mutate({
                        type: "upsert_calendar_event",
                        event: { ...ev, status: "done" },
                      })
                    }
                  >
                    <CheckCircle2 className="size-3.5" />
                    {t("انجام شد", "Mark Done", "تم الإنجاز")}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive"
                  onClick={() => mutation.mutate({ type: "delete_calendar_event", id: ev.id })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
