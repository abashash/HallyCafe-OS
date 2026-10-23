import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { AppLayout } from "@/components/AppLayout";
import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { getSavedStaffSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_DEFINITIONS } from "@/lib/feature-flags";

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matchedFeature = FEATURE_DEFINITIONS.find(
    (def) => def.route && (pathname === def.route || pathname.startsWith(def.route + "/")),
  );

  return (
    <AppLayout>
      {matchedFeature ? (
        <FeatureGuard feature={matchedFeature.key}>
          <Outlet />
        </FeatureGuard>
      ) : (
        <Outlet />
      )}
    </AppLayout>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const staffSession = getSavedStaffSession();
    if (staffSession) {
      return { user: null, staffUser: staffSession };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user, staffUser: null };
  },
  component: AuthenticatedLayout,
});
