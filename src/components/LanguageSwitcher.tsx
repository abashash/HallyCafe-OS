import { Globe } from "lucide-react";

import { useFeatureFlags } from "@/lib/hally-os";
import { type AppLanguage, LANGUAGE_META, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ALL_LANGS: AppLanguage[] = ["fa", "en", "ar"];

export function LanguageSwitcher({
  variant = "admin",
  className,
}: {
  variant?: "admin" | "public";
  className?: string;
}) {
  const { lang, setLang } = useI18n();
  const { config, isEnabled } = useFeatureFlags();

  if (!isEnabled("multilingual")) {
    return null;
  }

  const enabled =
    Array.isArray(config.enabled_languages) && config.enabled_languages.length > 0
      ? config.enabled_languages
      : ALL_LANGS;

  if (enabled.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-xs",
        variant === "public"
          ? "border-public-line bg-public-overlay text-public-foreground"
          : "border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground",
        className,
      )}
      role="group"
      aria-label="Language Switcher"
    >
      <Globe className="size-3.5 shrink-0 opacity-75" />
      {ALL_LANGS.filter((code) => enabled.includes(code)).map((code) => {
        const meta = LANGUAGE_META[code];
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={cn(
              "rounded px-2 py-0.5 font-semibold transition-colors",
              active
                ? variant === "public"
                  ? "bg-public-accent text-public-accent-foreground"
                  : "bg-sidebar-primary text-sidebar-primary-foreground"
                : "opacity-75 hover:opacity-100",
            )}
          >
            {code === "en" ? "EN" : meta.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
