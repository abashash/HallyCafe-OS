import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSavedStaffSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HALLY_CONFIG, type FeatureKey, type HallySystemConfig } from "@/lib/feature-flags";
import {
  type AdminMutationAction,
  getHallyFullBundle,
  getPublicHallyContext,
  mutateHallyStore,
} from "@/lib/hally-os.functions";
import { STAFF_ROLE_LABELS, type CafeOrder } from "@/lib/hally-types";
import { toBaseQty } from "@/lib/units";

export function useHallyBundle(refetchInterval?: number) {
  return useQuery({
    queryKey: ["hally-full-bundle"],
    queryFn: () => getHallyFullBundle(),
    staleTime: 10 * 1000,
    ...(refetchInterval ? { refetchInterval } : {}),
  });
}

export function usePublicHally(refetchInterval?: number) {
  return useQuery({
    queryKey: ["hally-public-context"],
    queryFn: () => getPublicHallyContext(),
    staleTime: 15 * 1000,
    ...(refetchInterval ? { refetchInterval } : {}),
  });
}

export function useSystemConfig(): HallySystemConfig {
  const { data: publicCtx } = usePublicHally();
  const { data: fullBundle } = useHallyBundle();
  return fullBundle?.config ?? publicCtx?.config ?? DEFAULT_HALLY_CONFIG;
}

export function useFeatureFlags() {
  const config = useSystemConfig();
  return {
    config,
    features: config.features,
    isEnabled: (key: FeatureKey) => config.features[key] !== false,
  };
}

export function useHallyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: AdminMutationAction) => {
      let actor = action.actor;
      if (!actor) {
        const staff = getSavedStaffSession();
        if (staff) {
          actor = {
            id: staff.id,
            name: staff.name,
            role: STAFF_ROLE_LABELS[staff.role] ?? staff.role,
          };
        } else {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            actor = {
              id: data.user.id,
              name: data.user.email || "مدیر سیستم",
              role: STAFF_ROLE_LABELS.admin,
            };
          }
        }
      }
      return mutateHallyStore({
        data: {
          ...action,
          ...(actor ? { actor } : {}),
        },
      });
    },
    onSuccess: async (updatedBundle) => {
      queryClient.setQueryData(["hally-full-bundle"], updatedBundle);
      await queryClient.invalidateQueries({ queryKey: ["hally-public-context"] });
    },
  });
}

/**
 * HallyCafe ADR 0009 & Phase 3 parity:
 * When an order transitions to 'paid', we idempotently:
 * 1. Accumulate its item quantities into `monthly_sales` in Supabase.
 * 2. Deduct recipe ingredient quantities from `ingredients.stock_qty` in Supabase
 *    and record `consumption` movements in the Hally Inventory Ledger.
 */
export async function syncPaidOrderToSupabaseAndInventory(
  order: CafeOrder,
  recordMovement: (action: AdminMutationAction) => Promise<unknown>,
  options?: { syncSales?: boolean; syncInventory?: boolean },
) {
  const shouldSyncSales = options?.syncSales ?? true;
  const shouldSyncInventory = options?.syncInventory ?? true;
  try {
    const dt = new Date(order.created_at || Date.now());
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;

    for (const item of order.items) {
      if (!item.menu_item_id || item.quantity <= 0) continue;

      // 1. Accumulate monthly sales (if sales module is enabled)
      if (shouldSyncSales) {
        const { data: existingSale } = await supabase
          .from("monthly_sales")
          .select("id,quantity")
          .eq("menu_item_id", item.menu_item_id)
          .eq("year", year)
          .eq("month", month)
          .maybeSingle();

        if (existingSale) {
          await supabase
            .from("monthly_sales")
            .update({ quantity: Number(existingSale.quantity) + item.quantity })
            .eq("id", existingSale.id);
        } else {
          await supabase.from("monthly_sales").insert({
            menu_item_id: item.menu_item_id,
            year,
            month,
            quantity: item.quantity,
          });
        }
      }

      // 2. Consume recipe ingredients from stock (if inventory module is enabled)
      if (shouldSyncInventory) {
        const { data: recipeLines } = await supabase
          .from("recipe_items")
          .select("ingredient_id,quantity,unit,ingredients(id,name,base_unit,stock_qty)")
          .eq("menu_item_id", item.menu_item_id);

        if (recipeLines && recipeLines.length > 0) {
          for (const r of recipeLines) {
            const ing = r.ingredients as unknown as {
              id: string;
              name: string;
              base_unit: string;
              stock_qty: number;
            } | null;
            if (!ing) continue;
            const baseConsumed = toBaseQty(Number(r.quantity) * item.quantity, r.unit);
            const nextStock = Number(ing.stock_qty) - baseConsumed;

            await supabase.from("ingredients").update({ stock_qty: nextStock }).eq("id", ing.id);

            await recordMovement({
              type: "record_inventory_movement",
              movement: {
                ingredient_id: ing.id,
                ingredient_name: ing.name,
                type: "consumption",
                quantity: -baseConsumed,
                unit: ing.base_unit,
                balance_after: nextStock,
                source: `سفارش #${order.order_number}`,
                reason: `مصرف رسپی (${item.item_name} × ${item.quantity})`,
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed syncing paid order with Supabase:", err);
  }
}
