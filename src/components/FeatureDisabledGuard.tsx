import { Link } from "@tanstack/react-router";
import { Lock, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURE_DEFINITIONS, type FeatureKey } from "@/lib/feature-flags";
import { useFeatureFlags } from "@/lib/hally-os";
import { useI18n } from "@/lib/i18n";

export function FeatureGuard({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { isEnabled } = useFeatureFlags();
  const { t, pick } = useI18n();

  if (isEnabled(feature)) {
    return <>{children}</>;
  }

  const def = FEATURE_DEFINITIONS.find((d) => d.key === feature);
  const title = def ? pick(def.title) : feature;

  return (
    <Card className="mx-auto my-12 max-w-lg border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">
            {t(
              `ماژول «${title}» غیرفعال است`,
              `Module "${title}" is currently disabled`,
              `وحدة «${title}» غير مفعلة حالياً`,
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "این امکان از طریق بخش تنظیمات برنامه غیرفعال شده است. در صورت نیاز می‌توانید آن را مجدداً فعال کنید.",
              "This feature has been disabled in application settings. You can re-enable it anytime from Settings.",
              "تم تعطيل هذه الميزة من إعدادات التطبيق. يمكنك تفعيلها مجدداً من قسم الإعدادات.",
            )}
          </p>
        </div>
        <Button asChild>
          <Link to="/settings">
            <Settings className="size-4" />
            {t(
              "رفتن به تنظیمات برنامه",
              "Open Application Settings",
              "الانتقال إلى إعدادات التطبيق",
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
