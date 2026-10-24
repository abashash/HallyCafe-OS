import { getSavedStaffSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { mutateHallyStore } from "@/lib/hally-os.functions";
import { STAFF_ROLE_LABELS } from "@/lib/hally-types";

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  const staff = getSavedStaffSession();
  const { data } = await supabase.auth.getUser();

  const actorName = staff?.name || data.user?.email || "مدیر سیستم";
  const actorRole = staff ? (STAFF_ROLE_LABELS[staff.role] ?? staff.role) : STAFF_ROLE_LABELS.admin;
  const actorId = staff?.id ?? data.user?.id ?? null;

  try {
    const summaryText =
      typeof details?.["name"] === "string"
        ? `${action} روی ${entity} («${details["name"]}»)`
        : `${action} روی ${entity}`;
    await mutateHallyStore({
      data: {
        type: "record_audit_entry",
        actor: {
          id: actorId,
          name: actorName,
          role: actorRole,
        },
        entry: {
          action,
          entity,
          entity_id: entityId ?? null,
          summary: summaryText,
          details: details ?? null,
        },
      },
    });
  } catch (err) {
    console.warn("Failed recording store audit entry:", err);
  }

  try {
    await supabase.from("audit_log").insert({
      user_id: data.user?.id ?? null,
      user_email: staff ? `${staff.name} (${actorRole})` : (data.user?.email ?? null),
      action,
      entity,
      entity_id: entityId ?? null,
      details: {
        ...(details ?? {}),
        actor_name: actorName,
        actor_role: actorRole,
      } as never,
    });
  } catch {
    // ignore if anonymous/staff tablet without Supabase write session
  }
}
