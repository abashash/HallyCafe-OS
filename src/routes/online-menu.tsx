import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Coffee,
  CupSoda,
  Flame,
  GlassWater,
  CakeSlice,
  IceCreamCone,
  Milk,
  UtensilsCrossed,
  CupSodaIcon,
  LayoutGrid,
  Plus,
  Minus,
  ShoppingBag,
  CalendarCheck,
  Star,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  CustomerAccountDialog,
  getSavedCustomerSessionToken,
} from "@/components/CustomerAccountDialog";
import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { PublicSiteLayout } from "@/components/PublicSiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags, usePublicHally } from "@/lib/hally-os";
import {
  createPublicOrder,
  createPublicReservation,
  getCustomerPortalBySession,
  getPublicOrderByToken,
  type CustomerPortalData,
  type PublicOrderView,
} from "@/lib/hally-os.functions";
import type { OrderType } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";
import { displayPrices } from "@/lib/menu-prices";
import { useBrandingImage, usePublicSiteSettings } from "@/lib/public-site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/online-menu")({
  head: () => ({
    meta: [
      { title: "منوی آنلاین و سفارش | کافه هالی" },
      {
        name: "description",
        content:
          "منوی دیجیتال کافه هالی؛ سفارش آنلاین سر میز (QR)، بیرون‌بر، رزرو میز و باشگاه مشتریان وفادار.",
      },
      { property: "og:title", content: "منوی آنلاین و سفارش | کافه هالی" },
      {
        property: "og:description",
        content: "منوی دیجیتال، سفارش آنلاین، رزرو میز و باشگاه مشتریان کافه هالی.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <PublicSiteLayout>
      <FeatureGuard feature="online_menu">
        <OnlineMenuPage />
      </FeatureGuard>
    </PublicSiteLayout>
  ),
});

type PublicItem = {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  image_url: string | null;
  is_featured: boolean;
  is_seasonal: boolean;
  is_available: boolean;
  category_id: string | null;
  sort_order: number;
  price_options: unknown;
};

type PublicCategory = { id: string; name: string; sort_order: number };

type CartEntry = {
  key: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  option_label?: string | undefined;
};

function catIcon(name: string): LucideIcon {
  if (/قهوه|اسپرسو|کافه|موکا|لاته|کاپوچینو|آمریکانو/.test(name)) return Coffee;
  if (/سرد|آیس|ایس|فراپه/.test(name)) return CupSoda;
  if (/گرم|داغ|هات/.test(name)) return Flame;
  if (/چای|دمنوش/.test(name)) return GlassWater;
  if (/اسموتی|Smoothie/.test(name)) return CupSodaIcon;
  if (/شیک|milkshake/.test(name)) return Milk;
  if (/کیک|دسر|شیرینی/.test(name)) return CakeSlice;
  if (/بستنی|جلاب/.test(name)) return IceCreamCone;
  if (/صبحانه|ساندویچ|غذا|میان‌وعده/.test(name)) return UtensilsCrossed;
  return Coffee;
}

function OnlineMenuPage() {
  const { dir, t, formatMoney, formatNumber, translateCategory } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const { data: settings } = usePublicSiteSettings();
  const { data: publicHally } = usePublicHally();

  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [tableCodeFromUrl, setTableCodeFromUrl] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  // Modals
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);

  // Checkout state
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [selectedTableCode, setSelectedTableCode] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Reservation state
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resDate, setResDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [resTime, setResTime] = useState("20:00");
  const [resGuests, setResGuests] = useState("4");
  const [resTableId, setResTableId] = useState("");
  const [resNotes, setResNotes] = useState("");
  const [submittingRes, setSubmittingRes] = useState(false);

  // Customer Portal / OTP state
  const [customerPortal, setCustomerPortal] = useState<CustomerPortalData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tbl = params.get("table");
    const ord = params.get("order");
    if (tbl) {
      setTableCodeFromUrl(tbl);
      setSelectedTableCode(tbl);
      setOrderType("dine_in");
    }
    if (ord) {
      setTrackingToken(ord);
    }
    const savedSession = getSavedCustomerSessionToken();
    if (savedSession) {
      void getCustomerPortalBySession({ data: { session_token: savedSession } })
        .then((portal) => {
          if (portal) {
            setCustomerPortal(portal);
            setCustomerName((prev) => prev || portal.customer.name);
            setCustomerPhone((prev) => prev || portal.customer.mobile);
            setResName((prev) => prev || portal.customer.name);
            setResPhone((prev) => prev || portal.customer.mobile);
          }
        })
        .catch(() => {});
    }
  }, []);

  const canOrderOnline = isEnabled("online_ordering") && isEnabled("orders");
  const canReserve = isEnabled("public_reservation") && isEnabled("reservations");
  const canLoyalty = isEnabled("public_loyalty") && isEnabled("customers");
  const canTables = isEnabled("tables");
  const canVouchers = isEnabled("vouchers");
  const canCategories = isEnabled("categories");

  const name = settings?.cafe_name?.trim() || t("کافه هالی", "Hally Cafe", "مقهى هالي");

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["public_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,sort_order")
        .eq("is_published", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as PublicCategory[];
    },
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["public_menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id,name,description,selling_price,image_url,is_featured,is_seasonal,is_available,category_id,sort_order,price_options",
        )
        .eq("is_published", true)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as PublicItem[];
    },
  });

  const { data: trackedOrder } = useQuery<PublicOrderView | null>({
    queryKey: ["public_tracked_order", trackingToken],
    enabled: Boolean(trackingToken),
    refetchInterval: 8000,
    queryFn: async () => {
      if (!trackingToken) return null;
      return await getPublicOrderByToken({ data: { token: trackingToken } });
    },
  });

  const loading = loadingCats || loadingItems;
  const [scrollCategoryId, setScrollCategoryId] = useState<string | null>(null);

  const publishedCategoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    return items.filter((i) => {
      if (i.category_id && !publishedCategoryIds.has(i.category_id)) return false;
      const catOk = active === "all" || i.category_id === active;
      const qOk = !needle || i.name.includes(needle) || (i.description ?? "").includes(needle);
      return catOk && qOk;
    });
  }, [items, active, q, publishedCategoryIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicItem[]>();
    for (const it of filtered) {
      const key = it.category_id ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      const groupItems = map.get(key);
      if (groupItems) groupItems.push(it);
    }
    const order: string[] = [
      ...categories.map((c) => c.id).filter((id) => map.has(id)),
      ...(map.has("__none__") ? ["__none__"] : []),
    ];
    return order.map((id) => ({
      id,
      name:
        id === "__none__"
          ? t("سایر", "Other", "أخرى")
          : translateCategory(categories.find((c) => c.id === id)?.name ?? "سایر"),
      items: map.get(id) ?? [],
    }));
  }, [filtered, categories, t, translateCategory]);

  useEffect(() => {
    if (grouped.length === 0) return;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 140 && active === "all") {
        setScrollCategoryId(null);
        return;
      }
      const threshold = 220;
      let currentId: string | null = grouped[0]?.id ?? null;
      for (const g of grouped) {
        const el = document.getElementById(`cat-section-${g.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          currentId = g.id;
        } else {
          break;
        }
      }
      setScrollCategoryId(currentId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [grouped, active]);

  function handleSelectCategoryRail(catId: string) {
    setActive(catId);
    setScrollCategoryId(catId === "all" ? null : catId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cartEntries = useMemo(() => Object.values(cart), [cart]);
  const totalCartQty = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.quantity, 0),
    [cartEntries],
  );
  const totalCartPrice = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.unit_price * e.quantity, 0),
    [cartEntries],
  );

  function updateCartItem(
    item: PublicItem,
    price: number,
    optionLabel: string | undefined,
    delta: number,
  ) {
    const key = optionLabel ? `${item.id}::${optionLabel}` : item.id;
    setCart((prev) => {
      const existing = prev[key];
      const nextQty = (existing?.quantity ?? 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: {
          key,
          menu_item_id: item.id,
          item_name: item.name,
          unit_price: price,
          quantity: nextQty,
          option_label: optionLabel,
        },
      };
    });
  }

  async function handlePlaceOrder() {
    if (cartEntries.length === 0) return;
    setSubmittingOrder(true);
    try {
      const result = await createPublicOrder({
        data: {
          order_type: orderType,
          table_code:
            orderType === "dine_in" ? selectedTableCode || tableCodeFromUrl || null : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          discount_code: discountCode,
          notes: orderNotes,
          items: cartEntries.map((e) => ({
            menu_item_id: e.menu_item_id,
            item_name: e.item_name,
            unit_price: e.unit_price,
            quantity: e.quantity,
            ...(e.option_label ? { option_label: e.option_label } : {}),
          })),
        },
      });
      setCart({});
      setCheckoutOpen(false);
      setTrackingToken(result.token);
      window.history.replaceState(
        null,
        "",
        `?order=${encodeURIComponent(result.token)}${
          tableCodeFromUrl ? `&table=${encodeURIComponent(tableCodeFromUrl)}` : ""
        }`,
      );
      toast.success(
        t(
          `سفارش #${result.order_number} با موفقیت ثبت شد!`,
          `Order #${result.order_number} placed successfully!`,
          `تم تسجيل الطلب #${result.order_number} بنجاح!`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handlePlaceReservation() {
    if (!resName.trim() || !resPhone.trim()) {
      toast.error(
        t(
          "نام و شماره تماس الزامی است",
          "Name and phone are required",
          "الاسم ورقم الهاتف مطلوبان",
        ),
      );
      return;
    }
    setSubmittingRes(true);
    try {
      await createPublicReservation({
        data: {
          customer_name: resName,
          customer_phone: resPhone,
          table_id: resTableId || null,
          reservation_date: resDate,
          start_time: resTime,
          guests: Number(resGuests) || 2,
          notes: resNotes,
        },
      });
      setReserveOpen(false);
      setResNotes("");
      toast.success(
        t(
          "درخواست رزرو میز شما ثبت شد. همکاران ما با شما تماس می‌گیرند.",
          "Your table reservation request has been submitted!",
          "تم تسجيل طلب حجز الطاولة بنجاح!",
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmittingRes(false);
    }
  }

  const matchedTableInfo = useMemo(() => {
    if (!tableCodeFromUrl) return null;
    return (
      publicHally?.tables.find((t) => t.code === tableCodeFromUrl) ?? {
        code: tableCodeFromUrl,
        name: tableCodeFromUrl,
      }
    );
  }, [tableCodeFromUrl, publicHally?.tables]);

  return (
    <div dir={dir} className="min-h-[calc(100svh-4rem)] bg-public-primary text-public-foreground">
      {/* Top Bar */}
      <header className="sticky top-16 z-30 border-b border-public-line bg-public-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Coffee className="size-6 shrink-0 text-public-accent" />
            <h1 className="truncate text-lg font-extrabold sm:text-xl">
              {t(`منوی ${name}`, `${name} Menu`, `قائمة ${name}`)}
            </h1>
            {canTables && matchedTableInfo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-public-accent px-2.5 py-0.5 text-xs font-bold text-public-accent-foreground">
                <QrCode className="size-3.5" />
                {t("میز:", "Table:", "طاولة:")} {matchedTableInfo.name}
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {canReserve && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReserveOpen(true)}
                className="border-public-line bg-public-overlay text-public-foreground hover:bg-public-accent hover:text-public-accent-foreground"
              >
                <CalendarCheck className="size-4" />
                {t("رزرو میز", "Reserve Table", "حجز طاولة")}
              </Button>
            )}
            {canLoyalty && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLoyaltyOpen(true)}
                className="border-public-line bg-public-overlay text-public-foreground hover:bg-public-accent hover:text-public-accent-foreground"
              >
                <Star className="size-4 text-public-accent" />
                {customerPortal
                  ? t(
                      `${customerPortal.customer.name} (${formatNumber(customerPortal.orders.length)} فاکتور)`,
                      `${customerPortal.customer.name} (${formatNumber(customerPortal.orders.length)} invoices)`,
                      `${customerPortal.customer.name}`,
                    )
                  : t(
                      "ورود با موبایل / فاکتورهای سابق",
                      "Mobile OTP Login / Past Invoices",
                      "دخول بالجوال / الفواتير السابقة",
                    )}
              </Button>
            )}
            <div className="relative w-full max-w-xs sm:w-56">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-public-muted" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("جستجو در منو…", "Search menu…", "البحث في القائمة…")}
                aria-label={t("جستجو در منو", "Search menu", "البحث في القائمة")}
                className="h-9 border-public-line bg-public-overlay pe-9 text-public-foreground placeholder:text-public-muted focus-visible:ring-public-accent"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Live Order Status Tracker Banner (if ?order=token is active) */}
      {trackingToken && trackedOrder && (
        <div className="mx-auto max-w-4xl px-3 pt-4 sm:px-6">
          <div className="rounded-xl border border-public-line bg-public-surface p-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-public-accent" />
                <span className="text-base font-black">
                  {t("پیگیری زنده سفارش", "Live Order Status", "حالة الطلب المباشرة")} #
                  {trackedOrder.order_number}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTrackingToken(null);
                  window.history.replaceState(null, "", window.location.pathname);
                }}
                className="text-xs text-public-muted hover:text-public-foreground"
              >
                <ArrowRight className="size-3.5" />
                {t("بستن وضعیت سفارش", "Hide Tracker", "إخفاء التتبع")}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-bold">
              {(
                [
                  ["pending", t("در انتظار", "Pending", "قيد الانتظار")],
                  ["preparing", t("در حال آماده‌سازی", "Preparing", "قيد التحضير")],
                  ["served", t("تحویل شد", "Served", "تم التقديم")],
                  ["paid", t("پرداخت شد", "Paid", "تم الدفع")],
                ] as const
              ).map(([st, label], idx) => {
                const order = ["pending", "preparing", "ready", "served", "paid"];
                const curIdx = order.indexOf(trackedOrder.status);
                const targetIdx = order.indexOf(st);
                const done = curIdx >= targetIdx && trackedOrder.status !== "cancelled";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border border-public-line py-2",
                      done
                        ? "bg-public-accent text-public-accent-foreground"
                        : "bg-public-overlay text-public-muted",
                    )}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-public-line pt-3 text-xs text-public-muted">
              <span>
                {trackedOrder.items.map((i) => `${i.item_name} ×${i.quantity}`).join("، ")}
              </span>
              <span className="font-bold text-public-accent">
                {t("جمع کل:", "Total:", "الإجمالي:")} {formatMoney(trackedOrder.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mx-auto grid max-w-7xl items-start gap-2 px-2 pb-28 pt-3 sm:gap-4 sm:px-4 lg:px-6",
          canCategories
            ? "grid-cols-[5rem_minmax(0,1fr)] sm:grid-cols-[6.5rem_minmax(0,1fr)]"
            : "grid-cols-1",
        )}
      >
        {canCategories && (
          <aside className="sticky top-32 flex max-h-[calc(100svh-9rem)] w-full flex-col overflow-y-auto rounded-md bg-public-surface">
            <RailButton
              icon={LayoutGrid}
              label={t("همه", "All", "الكل")}
              active={active === "all" && !scrollCategoryId}
              onClick={() => handleSelectCategoryRail("all")}
            />
            {categories.map((c) => {
              const isHighlighted =
                active === c.id || (active === "all" && scrollCategoryId === c.id);
              return (
                <RailButton
                  key={c.id}
                  icon={catIcon(c.name)}
                  label={translateCategory(c.name)}
                  active={isHighlighted}
                  onClick={() => handleSelectCategoryRail(c.id)}
                />
              );
            })}
          </aside>
        )}

        <main className="min-w-0">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-md bg-public-surface" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title={t(
                "منو هنوز منتشر نشده است",
                "Menu is not published yet",
                "لم يتم نشر القائمة بعد",
              )}
              text={t(
                "آیتم‌های منو پس از انتشار در پنل مدیریت اینجا نمایش داده می‌شوند.",
                "Menu items will appear here once published by the administrator.",
                "ستظهر عناصر القائمة هنا بمجرد نشرها في لوحة الإدارة.",
              )}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t("موردی پیدا نشد", "No matching items", "لم يتم العثور على نتائج")}
              text={t(
                "عبارت دیگری را جستجو کنید.",
                "Try searching for a different keyword.",
                "جرب البحث بكلمة أخرى.",
              )}
            />
          ) : (
            <>
              {active !== "all" && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-public-line bg-public-surface p-2.5 px-3 text-xs">
                  <span className="font-semibold text-public-muted">
                    {t("فیلتر دسته‌بندی:", "Filtered by category:", "تمت التصفية حسب:")}{" "}
                    <strong className="font-bold text-public-foreground">
                      {translateCategory(categories.find((c) => c.id === active)?.name ?? active)}
                    </strong>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSelectCategoryRail("all")}
                    className="h-7 text-xs text-public-accent hover:bg-public-overlay"
                  >
                    {t("نمایش همه آیتم‌ها", "Show All Items", "عرض جميع العناصر")}
                  </Button>
                </div>
              )}
              {grouped.map((g) => (
                <section
                  key={g.id}
                  id={`cat-section-${g.id}`}
                  data-category-id={g.id}
                  className="mb-8 scroll-mt-36"
                >
                  <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold sm:text-2xl">
                    {g.name}
                    <span
                      className={cn(
                        "inline-block h-1.5 w-10 rounded-full transition-colors",
                        scrollCategoryId === g.id ? "bg-public-accent" : "bg-public-accent/50",
                      )}
                    />
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((i) => (
                      <MenuCard
                        key={i.id}
                        item={i}
                        canOrder={canOrderOnline}
                        cart={cart}
                        onUpdateQty={updateCartItem}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </main>
      </div>

      {/* Sticky Floating Cart Bar */}
      {canOrderOnline && totalCartQty > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-public-line bg-public-surface px-4 py-3 text-public-foreground shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-public-accent font-black text-public-accent-foreground">
                {formatNumber(totalCartQty)}
              </span>
              <div>
                <p className="text-xs text-public-muted">
                  {t("مجموع سبد سفارش شما", "Your Order Basket", "إجمالي سلة طلبك")}
                </p>
                <p className="text-base font-extrabold text-public-accent">
                  {formatMoney(totalCartPrice)}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setCheckoutOpen(true)}
              className="bg-public-accent font-bold text-public-accent-foreground hover:bg-public-accent/90"
            >
              <ShoppingBag className="size-4" />
              {t("تکمیل و ثبت سفارش", "Checkout & Order", "إتمام الطلب")}
            </Button>
          </div>
        </div>
      )}

      {/* Online Order Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("تکمیل و ثبت سفارش آنلاین", "Complete Your Order", "إتمام الطلب عبر الإنترنت")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["dine_in", t("در سالن", "Dine-in", "داخل المقهى")],
                  ["takeaway", t("بیرون‌بر", "Takeaway", "سفري")],
                  ["delivery", t("پیک", "Delivery", "توصيل")],
                ] as const
              ).map(([k, label]) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={orderType === k ? "default" : "outline"}
                  onClick={() => setOrderType(k)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {canTables && orderType === "dine_in" && (publicHally?.tables.length ?? 0) > 0 && (
              <div className="space-y-1">
                <Label>{t("میز شما در سالن", "Your Table", "طاولتك")}</Label>
                <select
                  value={selectedTableCode}
                  onChange={(e) => setSelectedTableCode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">{t("انتخاب میز…", "Select table…", "اختر الطاولة…")}</option>
                  {publicHally?.tables.map((tbl) => (
                    <option key={tbl.id} value={tbl.code}>
                      {tbl.name} ({tbl.area})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("نام شما", "Your Name", "الاسم")}</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("اختیاری", "Optional", "اختياري")}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  {t("شماره موبایل (امتیاز وفاداری)", "Mobile (Loyalty)", "رقم الجوال")}
                </Label>
                <Input
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0912..."
                />
              </div>
            </div>

            {canVouchers && (
              <div className="space-y-1">
                <Label>{t("کد تخفیف (در صورت داشتن)", "Discount Code", "كود الخصم")}</Label>
                <Input
                  dir="ltr"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="HALLY10"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>{t("توضیحات سفارش", "Order Notes", "ملاحظات الطلب")}</Label>
              <Input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t(
                  "مثلاً کم‌شیرین، سرو همزمان و …",
                  "e.g. Less sugar…",
                  "مثال: سكر أقل…",
                )}
              />
            </div>

            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs">
              {cartEntries.map((e) => (
                <div key={e.key} className="flex justify-between">
                  <span>
                    {e.item_name} {e.option_label ? `(${e.option_label})` : ""} ×{e.quantity}
                  </span>
                  <span className="font-bold">{formatMoney(e.unit_price * e.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-sm font-extrabold">
                <span>{t("جمع کل:", "Total:", "الإجمالي:")}</span>
                <span className="text-primary">{formatMoney(totalCartPrice)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={handlePlaceOrder} disabled={submittingOrder}>
              <CheckCircle2 className="size-4" />
              {t("ارسال نهایی سفارش", "Place Order Now", "تأكيد وإرسال الطلب")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Public Table Reservation Dialog */}
      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("رزرو آنلاین میز", "Online Table Reservation", "حجز طاولة عبر الإنترنت")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("نام و نام خانوادگی", "Full Name", "الاسم الكامل")}</Label>
                <Input value={resName} onChange={(e) => setResName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("شماره تماس", "Phone", "رقم الهاتف")}</Label>
                <Input dir="ltr" value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>{t("تاریخ (شمسی)", "Date (Jalali)", "التاريخ (شمسي)")}</Label>
                <JalaliDatePicker value={resDate} onChange={setResDate} />
              </div>
              <div className="space-y-1">
                <Label>{t("ساعت", "Time", "الوقت")}</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("تعداد نفرات", "Guests", "الأشخاص")}</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={resGuests}
                  onChange={(e) => setResGuests(e.target.value)}
                />
              </div>
            </div>
            {canTables && (publicHally?.tables.length ?? 0) > 0 && (
              <div className="space-y-1">
                <Label>{t("میز دلخواه (اختیاری)", "Preferred Table", "الطاولة المفضلة")}</Label>
                <select
                  value={resTableId}
                  onChange={(e) => setResTableId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">
                    {t("انتخاب خودکار توسط کافه", "Best available table", "أفضل طاولة متاحة")}
                  </option>
                  {publicHally?.tables.map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      {tbl.name} ({tbl.capacity} {t("نفر", "guests", "أشخاص")})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label>{t("توضیحات (مناسبت، تولد و …)", "Special Requests", "ملاحظات خاصة")}</Label>
              <Input value={resNotes} onChange={(e) => setResNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handlePlaceReservation} disabled={submittingRes}>
              {t("ثبت درخواست رزرو", "Submit Reservation", "تأكيد الحجز")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Account, OTP Login (Mediana / MeliPayamak), Loyalty & Past Invoices */}
      <CustomerAccountDialog
        open={loyaltyOpen}
        onOpenChange={setLoyaltyOpen}
        defaultProvider={publicHally?.config.sms_provider ?? "mediana"}
        currencySymbol={publicHally?.config.currency_symbol}
        onCustomerAuthenticated={(portal) => {
          setCustomerPortal(portal);
          if (portal) {
            setCustomerName(portal.customer.name);
            setCustomerPhone(portal.customer.mobile);
            setResName(portal.customer.name);
            setResPhone(portal.customer.mobile);
          }
        }}
        onApplyVoucherCode={(code) => {
          setDiscountCode(code);
          setLoyaltyOpen(false);
          if (totalCartQty > 0) {
            setCheckoutOpen(true);
          }
        }}
      />
    </div>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className={cn(
        "h-auto min-h-20 w-full flex-col gap-2 rounded-none border-b border-public-line px-1 py-3 text-public-foreground hover:bg-public-overlay hover:text-public-foreground last:border-b-0",
        active &&
          "bg-public-accent text-public-accent-foreground hover:bg-public-accent/90 hover:text-public-accent-foreground",
      )}
      aria-pressed={active}
    >
      <Icon className="size-6" />
      <span className="text-center text-xs font-semibold leading-tight">{label}</span>
    </Button>
  );
}

function MenuCard({
  item,
  canOrder,
  cart,
  onUpdateQty,
}: {
  item: PublicItem;
  canOrder: boolean;
  cart: Record<string, CartEntry>;
  onUpdateQty: (
    item: PublicItem,
    price: number,
    optionLabel: string | undefined,
    delta: number,
  ) => void;
}) {
  const { t, formatMoney } = useI18n();
  const prices = displayPrices(Number(item.selling_price), item.price_options);

  return (
    <article
      className={cn(
        "flex min-h-36 gap-3 rounded-md bg-public-surface p-3 sm:gap-4 sm:p-4",
        !item.is_available && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold sm:text-xl">{item.name}</h3>
            {item.is_featured && (
              <span className="shrink-0 rounded-full bg-public-accent px-2 py-0.5 text-[11px] font-bold text-public-accent-foreground">
                {t("ویژه", "Special", "مميز")}
              </span>
            )}
            {item.is_seasonal && (
              <span className="shrink-0 rounded-full border border-white/30 px-2 py-0.5 text-[11px]">
                {t("فصلی", "Seasonal", "موسمي")}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-public-muted sm:text-sm">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {prices.map((p, idx) => {
            const optLabel = p.label || undefined;
            const key = optLabel ? `${item.id}::${optLabel}` : item.id;
            const qty = cart[key]?.quantity ?? 0;

            return (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="text-base font-extrabold text-public-accent">
                  {p.label && (
                    <span className="me-1.5 text-xs font-semibold text-public-muted">
                      {p.label}
                    </span>
                  )}
                  {formatMoney(p.price)}
                </span>

                {!item.is_available ? (
                  <span className="rounded-full border border-public-line px-2 py-0.5 text-[11px] text-public-muted">
                    {t("ناموجود", "Sold Out", "غير متوفر")}
                  </span>
                ) : canOrder ? (
                  qty > 0 ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-public-primary px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item, p.price, optLabel, -1)}
                        className="grid size-6 place-items-center rounded bg-public-surface text-public-foreground"
                        aria-label="Decrease"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-5 text-center text-xs font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item, p.price, optLabel, 1)}
                        className="grid size-6 place-items-center rounded bg-public-accent text-public-accent-foreground"
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item, p.price, optLabel, 1)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-public-primary text-public-foreground transition-colors hover:bg-public-accent hover:text-public-accent-foreground"
                      aria-label={t("افزودن به سفارش", "Add to order", "إضافة للطلب")}
                    >
                      <Plus className="size-4" />
                    </button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <ItemImage src={item.image_url} name={item.name} />
    </article>
  );
}

function ItemImage({ src: path, name }: { src: string | null; name: string }) {
  const { data: src } = useBrandingImage(path);
  if (!src) {
    return (
      <div
        className="grid size-20 shrink-0 place-items-center rounded-md bg-public-overlay sm:size-28"
        aria-hidden
      >
        <Coffee className="size-8 text-public-muted" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className="size-20 shrink-0 rounded-md object-cover sm:size-28"
    />
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-public-line bg-public-surface py-14 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-public-muted">{text}</p>
    </div>
  );
}
