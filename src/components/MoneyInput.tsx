import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Numeric money input with live thousands separator (e.g. 12,500,000).
 * `value` / `onChange` always carry the raw digits (no separators).
 */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  onBlur,
}: {
  value: string;
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(() => formatWithSep(value));

  // Sync external changes (form reset, edit load) when they differ.
  useEffect(() => {
    setText((prev) => (stripSep(prev) === value ? prev : formatWithSep(value)));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      dir="ltr"
      className={cn("text-left", className)}
      placeholder={placeholder}
      disabled={disabled}
      onBlur={onBlur}
      value={text}
      onChange={(e) => {
        const raw = stripSep(e.target.value);
        if (raw === "" || /^\d+(\.\d{0,4})?$/.test(raw)) {
          setText(formatWithSep(raw));
          onChange(raw);
        }
      }}
    />
  );
}

function stripSep(s: string): string {
  return s.replace(/[,،\s]/g, "");
}

function formatWithSep(raw: string): string {
  if (!raw) return "";
  const [intPart = "", decPart] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}
