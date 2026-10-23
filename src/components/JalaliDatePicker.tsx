import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  JALALI_MONTHS,
  JALALI_MONTHS_EN,
  JALALI_WEEKDAYS,
  JALALI_WEEKDAYS_EN,
  isoToJalaliParts,
  jalaliMonthLength,
  jalaliToIso,
  jalaliWeekday,
  localizeDigits,
  todayJalali,
} from "@/lib/jalali";

interface Props {
  /** تاریخ میلادی به شکل YYYY-MM-DD (نمایش همیشه شمسی) */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
}

export function JalaliDatePicker({ value, onChange, className, id }: Props) {
  const { lang, dir, t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => isoToJalaliParts(value), [value]);
  const today = useMemo(() => todayJalali(), []);
  const [view, setView] = useState(() => {
    const s = isoToJalaliParts(value) ?? todayJalali();
    return { jy: s.jy, jm: s.jm };
  });

  const months = lang === "en" ? JALALI_MONTHS_EN : JALALI_MONTHS;
  const weekdays = lang === "en" ? JALALI_WEEKDAYS_EN : JALALI_WEEKDAYS;
  const days = jalaliMonthLength(view.jy, view.jm);
  const offset = jalaliWeekday(view.jy, view.jm, 1);

  const move = (delta: number) => {
    let jm = view.jm + delta;
    let jy = view.jy;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setView({ jy, jm });
  };

  const formattedSelected = selected
    ? localizeDigits(`${selected.jd} ${months[selected.jm - 1]} ${selected.jy}`, lang)
    : t("انتخاب تاریخ شمسی", "Select Jalali Date", "اختر التاريخ الشمسي");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("w-full justify-between font-normal", className)}
        >
          <span>{formattedSelected}</span>
          <CalendarDays className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" dir={dir}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => move(-1)}>
            {dir === "rtl" ? "‹" : "‹"}
          </Button>
          <div className="text-sm font-medium">
            {months[view.jm - 1]} {localizeDigits(String(view.jy), lang)}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => move(1)}>
            {dir === "rtl" ? "›" : "›"}
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((w, idx) => (
            <div key={`${w}-${idx}`} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const isSel =
              selected && selected.jy === view.jy && selected.jm === view.jm && selected.jd === d;
            const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onChange(jalaliToIso(view.jy, view.jm, d));
                  setOpen(false);
                }}
                className={cn(
                  "h-8 w-8 rounded-md text-sm transition-colors hover:bg-accent",
                  isSel && "bg-primary text-primary-foreground hover:bg-primary",
                  !isSel && isToday && "border border-primary/60",
                )}
              >
                {localizeDigits(String(d), lang)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(jalaliToIso(today.jy, today.jm, today.jd));
              setView({ jy: today.jy, jm: today.jm });
              setOpen(false);
            }}
          >
            {t("امروز", "Today (Jalali)", "اليوم")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
