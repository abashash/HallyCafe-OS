import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Check, CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHallyBundle, useHallyMutation } from "@/lib/hally-os";
import type { TableReservation } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [{ title: "رزرو میز | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="reservations">
      <ReservationsPage />
    </FeatureGuard>
  ),
});

function ReservationsPage() {
  const { t, formatDate, formatNumber } = useI18n();
  const { data: bundle } = useHallyBundle();
  const mutation = useHallyMutation();

  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableId, setTableId] = useState<string>("none");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("19:00");
  const [guests, setGuests] = useState("4");
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const reservations = (bundle?.store.reservations ?? []).filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );
  const activeTables = (bundle?.store.tables ?? []).filter((tbl) => tbl.status === "active");

  async function handleCreate() {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(
        t(
          "نام و شماره تماس مشتری الزامی است",
          "Customer name and phone are required",
          "اسم ورقم هاتف العميل مطلوبان",
        ),
      );
      return;
    }
    try {
      await mutation.mutateAsync({
        type: "upsert_reservation",
        reservation: {
          customer_name: customerName,
          customer_phone: customerPhone,
          table_id: tableId === "none" ? null : tableId,
          reservation_date: date,
          start_time: startTime,
          guests: Number(guests) || 2,
          notes,
        },
      });
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setOpen(false);
      toast.success(t("رزرو جدید ثبت شد", "Reservation created", "تم تسجيل الحجز"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function statusBadge(status: TableReservation["status"]) {
    switch (status) {
      case "reserved":
        return <Badge variant="secondary">{t("رزرو شده", "Reserved", "محجوز")}</Badge>;
      case "confirmed":
        return <Badge>{t("تأیید شده", "Confirmed", "مؤكد")}</Badge>;
      case "completed":
        return <Badge className="bg-emerald-600">{t("انجام شد", "Completed", "مكتمل")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t("لغو شده", "Cancelled", "ملغى")}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("مدیریت رزرو میزها", "Table Reservations", "إدارة حجوزات الطاولات")}
        description={t(
          "مدیریت رزروهای ثبت‌شده توسط مشتریان و پرسنل به همراه تخصیص میز.",
          "Manage guest table reservations, assign tables, and update booking statuses.",
          "إدارة حجوزات الطاولات وتعيين الطاولات وتحديث حالة الحجز.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("همه وضعیت‌ها", "All Statuses", "جميع الحالات")}
                </SelectItem>
                <SelectItem value="reserved">{t("رزرو شده", "Reserved", "محجوز")}</SelectItem>
                <SelectItem value="confirmed">{t("تأیید شده", "Confirmed", "مؤكد")}</SelectItem>
                <SelectItem value="completed">{t("انجام شد", "Completed", "مكتمل")}</SelectItem>
                <SelectItem value="cancelled">{t("لغو شده", "Cancelled", "ملغى")}</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("رزرو جدید", "New Reservation", "حجز جديد")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("ثبت رزرو میز", "Create Reservation", "تسجيل حجز طاولة")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("نام مشتری", "Customer Name", "اسم العميل")}</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("تلفن تماس", "Phone", "رقم الهاتف")}</Label>
                      <Input
                        dir="ltr"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("انتخاب میز", "Table", "الطاولة")}</Label>
                      <Select value={tableId} onValueChange={setTableId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("تخصیص خودکار", "Auto-assign", "تعيين تلقائي")}
                          </SelectItem>
                          {activeTables.map((tbl) => (
                            <SelectItem key={tbl.id} value={tbl.id}>
                              {tbl.name} ({tbl.capacity} {t("نفر", "guests", "أشخاص")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("تعداد نفرات", "Guests", "عدد الأشخاص")}</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("تاریخ (شمسی)", "Date (Jalali)", "التاريخ (شمسي)")}</Label>
                      <JalaliDatePicker value={date} onChange={setDate} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("ساعت", "Time", "الوقت")}</Label>
                      <Input
                        type="time"
                        dir="ltr"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("توضیحات", "Notes", "ملاحظات")}</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={mutation.isPending}>
                    {t("ثبت رزرو", "Save Reservation", "حفظ الحجز")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarCheck className="mb-2 size-10 opacity-40" />
              <p>{t("رزروی یافت نشد", "No reservations found", "لم يتم العثور على حجوزات")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("مشتری", "Customer", "العميل")}</TableHead>
                  <TableHead>{t("تلفن", "Phone", "الهاتف")}</TableHead>
                  <TableHead>{t("میز", "Table", "الطاولة")}</TableHead>
                  <TableHead>{t("تاریخ و ساعت", "Date & Time", "التاريخ والوقت")}</TableHead>
                  <TableHead>{t("نفرات", "Guests", "الأشخاص")}</TableHead>
                  <TableHead>{t("وضعیت", "Status", "الحالة")}</TableHead>
                  <TableHead>{t("عملیات", "Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-bold">{r.customer_name}</div>
                      {r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {r.customer_phone}
                    </TableCell>
                    <TableCell>{r.table_name}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {formatDate(r.reservation_date)} • {r.start_time}
                    </TableCell>
                    <TableCell>{formatNumber(r.guests)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.status === "reserved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              mutation.mutate({
                                type: "update_reservation_status",
                                id: r.id,
                                status: "confirmed",
                              })
                            }
                          >
                            <Check className="size-3.5" />
                            {t("تأیید", "Confirm", "تأكيد")}
                          </Button>
                        )}
                        {(r.status === "reserved" || r.status === "confirmed") && (
                          <Button
                            size="sm"
                            onClick={() =>
                              mutation.mutate({
                                type: "update_reservation_status",
                                id: r.id,
                                status: "completed",
                              })
                            }
                          >
                            <CheckCircle2 className="size-3.5" />
                            {t("انجام شد", "Complete", "مكتمل")}
                          </Button>
                        )}
                        {r.status !== "cancelled" && r.status !== "completed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            onClick={() =>
                              mutation.mutate({
                                type: "update_reservation_status",
                                id: r.id,
                                status: "cancelled",
                              })
                            }
                          >
                            <XCircle className="size-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground"
                          onClick={() => mutation.mutate({ type: "delete_reservation", id: r.id })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
  );
}
