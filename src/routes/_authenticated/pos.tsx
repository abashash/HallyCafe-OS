import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FeatureGuard } from "@/components/FeatureDisabledGuard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { supabase } from "@/integrations/supabase/client";
import {
  syncPaidOrderToSupabaseAndInventory,
  useFeatureFlags,
  useHallyBundle,
  useHallyMutation,
} from "@/lib/hally-os";
import type { CafeOrder, OrderType } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";
import { toEnglishDigits } from "@/lib/jalali";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [{ title: "صندوق فروش (POS) | کافه هالی" }],
  }),
  component: () => (
    <FeatureGuard feature="pos">
      <PosPage />
    </FeatureGuard>
  ),
});

type PosCartLine = {
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
};

function PosPage() {
  const { dir, t, formatMoney, formatNumber, translateCategory } = useI18n();
  const { isEnabled } = useFeatureFlags();
  const queryClient = useQueryClient();
  const { data: bundle } = useHallyBundle(12000);
  const mutation = useHallyMutation();

  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableCode, setTableCode] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "zarinpal" | "zibal">(
    "card",
  );
  const [posReceiptNumber, setPosReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Settlement modal state for open active orders
  const [settlingOrder, setSettlingOrder] = useState<CafeOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<"card" | "cash" | "zarinpal" | "zibal">("card");
  const [settleReceiptNumber, setSettleReceiptNumber] = useState("");

  const tablesEnabled = isEnabled("tables");
  const customersEnabled = isEnabled("customers");
  const loyaltyEnabled = customersEnabled && isEnabled("loyalty");
  const vouchersEnabled = isEnabled("vouchers");
  const paymentsEnabled = isEnabled("payments");
  const printersEnabled = isEnabled("printers");
  const ordersEnabled = isEnabled("orders");
  const categoriesEnabled = isEnabled("categories");

  const { data: categories = [] } = useQuery({
    queryKey: ["pos_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["pos_menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,selling_price,category_id,is_active,is_available")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredItems = useMemo(() => {
    const q = search.trim();
    return menuItems.filter((item) => {
      const catMatch =
        !categoriesEnabled || selectedCat === "all" || item.category_id === selectedCat;
      const qMatch = !q || item.name.includes(q);
      return catMatch && qMatch;
    });
  }, [menuItems, selectedCat, search, categoriesEnabled]);

  const activeTables = useMemo(
    () => (bundle?.store.tables ?? []).filter((tbl) => tbl.status === "active"),
    [bundle?.store.tables],
  );

  const activeOrders = useMemo(
    () =>
      (bundle?.store.orders ?? []).filter((o) => o.status !== "paid" && o.status !== "cancelled"),
    [bundle?.store.orders],
  );

  const matchedCustomer = useMemo(() => {
    if (!customersEnabled) return null;
    const p = customerPhone.trim();
    if (!p) return null;
    return (bundle?.store.customers ?? []).find((c) => c.mobile === p) ?? null;
  }, [customerPhone, bundle?.store.customers, customersEnabled]);

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [cart],
  );

  const discountPreview = useMemo(() => {
    if (!vouchersEnabled) return 0;
    const code = discountCode.trim().toUpperCase();
    if (!code) return 0;
    const voucher = (bundle?.store.vouchers ?? []).find(
      (v) => v.code.toUpperCase() === code && v.status === "active",
    );
    if (!voucher || subtotal < voucher.min_order) return 0;
    if (voucher.kind === "percent") {
      const raw = Math.round((subtotal * voucher.value) / 100);
      return voucher.max_discount > 0 ? Math.min(raw, voucher.max_discount) : raw;
    }
    return Math.min(subtotal, voucher.value);
  }, [discountCode, subtotal, bundle?.store.vouchers, vouchersEnabled]);

  const afterDiscount = Math.max(0, subtotal - discountPreview);
  const taxRate =
    bundle?.config.tax_enabled && !bundle?.config.tax_inclusive ? bundle.config.tax_rate : 0;
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const payableTotal = afterDiscount + taxAmount;

  function addItem(item: { id: string; name: string; selling_price: number }) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.menu_item_id === item.id);
      if (idx >= 0) {
        return prev.map((x, i) => (i === idx ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.name,
          unit_price: Number(item.selling_price) || 0,
          unit_cost: 0,
          quantity: 1,
        },
      ];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((x) => (x.menu_item_id === menuItemId ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0),
    );
  }

  async function submitOrder(immediatePay: boolean) {
    if (cart.length === 0) {
      toast.error(t("سبد سفارش خالی است", "Order cart is empty", "سلة الطلب فارغة"));
      return;
    }
    if (tablesEnabled && activeTables.length > 0 && !tableCode) {
      toast.error(
        t(
          "انتخاب میز برای ثبت سفارش اجباری است",
          "Selecting a table is mandatory",
          "اختيار الطاولة إلزامي لتسجيل الطلب",
        ),
      );
      return;
    }
    const cleanReceipt = toEnglishDigits(posReceiptNumber).trim();
    if (immediatePay && paymentMethod === "card" && !cleanReceipt) {
      toast.error(
        t(
          "لطفاً شماره پرداخت فیش کارتخوان (POS) را وارد کنید",
          "Please enter the POS card receipt number",
          "يرجى إدخال رقم إيصال جهاز الدفع (POS)",
        ),
      );
      return;
    }

    try {
      const updated = await mutation.mutateAsync({
        type: "create_pos_order",
        order: {
          order_type: orderType,
          table_code: tableCode || null,
          customer_name: customersEnabled ? customerName || matchedCustomer?.name || "" : "",
          customer_phone: customersEnabled ? customerPhone : "",
          discount_code: vouchersEnabled ? discountCode : "",
          notes,
          items: cart,
          immediate_pay: immediatePay,
          payment_method: paymentMethod,
          payment_reference: cleanReceipt || null,
        },
      });

      const createdOrder = updated.store.orders[0];
      if (immediatePay && createdOrder) {
        await syncPaidOrderToSupabaseAndInventory(
          createdOrder,
          (act) => mutation.mutateAsync(act),
          {
            syncSales: isEnabled("sales"),
            syncInventory: isEnabled("inventory") && isEnabled("ingredients"),
          },
        );
        await queryClient.invalidateQueries({ queryKey: ["monthly_sales"] });
        await queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      }

      setCart([]);
      setDiscountCode("");
      setPosReceiptNumber("");
      setNotes("");
      toast.success(
        immediatePay
          ? t(
              `سفارش #${createdOrder?.order_number ?? ""} ثبت و تسویه شد`,
              `Order #${createdOrder?.order_number ?? ""} settled and paid`,
              `تم تسجيل وتسوية الطلب #${createdOrder?.order_number ?? ""}`,
            )
          : t(
              `سفارش #${createdOrder?.order_number ?? ""} به آشپزخانه ارسال شد`,
              `Order #${createdOrder?.order_number ?? ""} sent to kitchen`,
              `تم إرسال الطلب #${createdOrder?.order_number ?? ""} إلى المطبخ`,
            ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function openSettleDialog(ord: CafeOrder) {
    setSettlingOrder(ord);
    setSettleMethod(paymentMethod);
    setSettleReceiptNumber(posReceiptNumber || ord.payment_reference || "");
  }

  async function confirmSettleActiveOrder() {
    if (!settlingOrder) return;
    const cleanRef = toEnglishDigits(settleReceiptNumber).trim();
    if (settleMethod === "card" && !cleanRef) {
      toast.error(
        t(
          "لطفاً شماره پرداخت فیش کارتخوان (POS) را وارد کنید",
          "Please enter the POS card receipt number",
          "يرجى إدخال رقم إيصال جهاز الدفع (POS)",
        ),
      );
      return;
    }

    try {
      await mutation.mutateAsync({
        type: "update_order_status",
        id: settlingOrder.id,
        status: "paid",
        payment_method: settleMethod,
        payment_reference: cleanRef || null,
      });
      if (!settlingOrder.sales_synced) {
        await syncPaidOrderToSupabaseAndInventory(
          settlingOrder,
          (act) => mutation.mutateAsync(act),
          {
            syncSales: isEnabled("sales"),
            syncInventory: isEnabled("inventory") && isEnabled("ingredients"),
          },
        );
        await queryClient.invalidateQueries({ queryKey: ["monthly_sales"] });
        await queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      }
      setSettlingOrder(null);
      setSettleReceiptNumber("");
      toast.success(
        t("سفارش با موفقیت تسویه شد", "Order settled successfully", "تم تسوية الطلب بنجاح"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          "صندوق و پایانه فروش (POS)",
          "Point of Sale Terminal (POS)",
          "نقطة البيع والكاشير (POS)",
        )}
        description={t(
          "ثبت سریع سفارش حضوری با انتخاب اجباری میز، ثبت شماره فیش پرداخت کارتخوان و تسویه آنی.",
          "Fast counter ordering with mandatory table assignment, POS receipt tracking, and instant checkout.",
          "تسجيل الطلبات السريع مع اختيار الطاولة الإلزامي وإدخال رقم إيصال الدفع.",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]">
        {/* Left / Menu Catalog */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    "جستجوی نام آیتم منو…",
                    "Search menu items…",
                    "بحث في عناصر القائمة…",
                  )}
                  className="pe-9"
                />
              </div>
              {categoriesEnabled && (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedCat === "all" ? "default" : "outline"}
                    onClick={() => setSelectedCat("all")}
                  >
                    {t("همه", "All", "الكل")}
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={selectedCat === cat.id ? "default" : "outline"}
                      onClick={() => setSelectedCat(cat.id)}
                    >
                      {translateCategory(cat.name)}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((x) => x.menu_item_id === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.is_available}
                  onClick={() => addItem(item)}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-start transition-all hover:border-primary hover:shadow-sm disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground">{item.name}</span>
                    {inCart && <Badge className="shrink-0">×{formatNumber(inCart.quantity)}</Badge>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-primary">
                      {formatMoney(Number(item.selling_price))}
                    </span>
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Plus className="size-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right / Current Order Ticket & Active Table Queue */}
        <div className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-5 text-primary" />
                  {t("فاکتور سفارش جاری", "Current Order Ticket", "تذكرة الطلب الحالي")}
                </span>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCart([])}
                    className="h-7 text-xs text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    {t("پاک کردن", "Clear", "مسح")}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["dine_in", t("در سالن", "Dine-in", "داخل الصالة")],
                    ["takeaway", t("بیرون‌بر", "Takeaway", "سفري")],
                    ["delivery", t("پیک", "Delivery", "توصيل")],
                  ] as const
                ).map(([typeKey, label]) => (
                  <Button
                    key={typeKey}
                    type="button"
                    size="sm"
                    variant={orderType === typeKey ? "default" : "outline"}
                    onClick={() => setOrderType(typeKey)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {tablesEnabled && (
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>
                      {t(
                        "انتخاب میز (اجباری)",
                        "Select Table (Mandatory)",
                        "اختيار الطاولة (إلزامي)",
                      )}{" "}
                      <span className="text-destructive">*</span>
                    </span>
                    {!tableCode && (
                      <span className="text-[11px] font-semibold text-amber-600">
                        {t("میز را انتخاب کنید", "Required", "مطلوب")}
                      </span>
                    )}
                  </Label>
                  <Select value={tableCode} onValueChange={setTableCode}>
                    <SelectTrigger
                      className={
                        !tableCode ? "border-amber-500/60 bg-amber-500/5" : "border-emerald-500/60"
                      }
                    >
                      <SelectValue
                        placeholder={t(
                          "لطفاً میز سفارش را انتخاب کنید…",
                          "Please select a table…",
                          "يرجى اختيار الطاولة…",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTables.map((tbl) => (
                        <SelectItem key={tbl.id} value={tbl.code}>
                          {tbl.name} ({tbl.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {customersEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t("موبایل مشتری", "Customer Mobile", "جوال العميل")}
                    </Label>
                    <Input
                      dir="ltr"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(toEnglishDigits(e.target.value))}
                      placeholder="0912..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t("نام مشتری", "Customer Name", "اسم العميل")}
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={matchedCustomer?.name || t("مهمان", "Guest", "ضيف")}
                    />
                  </div>
                </div>
              )}

              {loyaltyEnabled && matchedCustomer && (
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  {t("عضو باشگاه مشتریان:", "Loyalty Member:", "عضو نادي الولاء:")}{" "}
                  <strong>{matchedCustomer.name}</strong> —{" "}
                  {formatNumber(matchedCustomer.loyalty_points)} {t("امتیاز", "pts", "نقطة")} (
                  {matchedCustomer.loyalty_level.toUpperCase()})
                </div>
              )}

              {/* Cart Items */}
              <div className="max-h-60 space-y-2 overflow-y-auto border-y border-border py-3">
                {cart.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t(
                      "آیتمی از منو انتخاب کنید.",
                      "Click menu items to add them to this order.",
                      "انقر على عناصر القائمة لإضافتها إلى الطلب.",
                    )}
                  </p>
                ) : (
                  cart.map((line) => (
                    <div
                      key={line.menu_item_id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{line.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(line.unit_price * line.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-7"
                          onClick={() => updateQty(line.menu_item_id, -1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-6 text-center font-bold">
                          {formatNumber(line.quantity)}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-7"
                          onClick={() => updateQty(line.menu_item_id, 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={`grid gap-2 ${vouchersEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
                {vouchersEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">{t("کد تخفیف", "Voucher Code", "كود الخصم")}</Label>
                    <Input
                      dir="ltr"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="HALLY10"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t("روش پرداخت", "Payment Method", "طريقة الدفع")}
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) =>
                      setPaymentMethod(v as "card" | "cash" | "zarinpal" | "zibal")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">
                        {t("کارتخوان (POS)", "Card Terminal (POS)", "جهاز البطاقة (POS)")}
                      </SelectItem>
                      <SelectItem value="cash">{t("نقدی", "Cash", "نقدي")}</SelectItem>
                      <SelectItem value="zarinpal">
                        {t("زرین‌پال", "Zarinpal", "زرين بال")}
                      </SelectItem>
                      <SelectItem value="zibal">{t("زیبال", "Zibal", "زيبال")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentMethod === "card" && (
                <div className="space-y-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <Label className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-primary" />
                      {t(
                        "شماره پرداخت فیش کارتخوان (POS)",
                        "POS Terminal Receipt / Tracking No.",
                        "رقم إيصال جهاز الدفع (POS)",
                      )}{" "}
                      <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {t(
                        "الزامی هنگام تسویه با پوز",
                        "Required for POS settlement",
                        "إلزامي للدفع",
                      )}
                    </span>
                  </Label>
                  <Input
                    dir="ltr"
                    value={posReceiptNumber}
                    onChange={(e) => setPosReceiptNumber(toEnglishDigits(e.target.value))}
                    placeholder={t(
                      "شماره فیش یا پیگیری رسید پوز را وارد کنید (مثلاً 482910)",
                      "Enter POS slip/tracking number (e.g. 482910)",
                      "أدخل رقم إيصال جهاز الدفع",
                    )}
                    className="bg-background font-mono text-sm"
                  />
                </div>
              )}

              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  "توضیحات سفارش (کم‌شیرین، بدون یخ و …)",
                  "Order notes…",
                  "ملاحظات الطلب…",
                )}
              />

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("جمع اقلام:", "Subtotal:", "المجموع الفرعي:")}
                  </span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {discountPreview > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t("تخفیف کوپن:", "Discount:", "الخصم:")}</span>
                    <span>-{formatMoney(discountPreview)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("مالیات:", "Tax:", "الضريبة:")}
                    </span>
                    <span>{formatMoney(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
                  <span>{t("قابل پرداخت:", "Total Payable:", "الإجمالي المستحق:")}</span>
                  <span className="text-primary">{formatMoney(payableTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => submitOrder(false)}
                  disabled={mutation.isPending || cart.length === 0}
                >
                  <Send className="size-4" />
                  {t("ارسال به آشپزخانه", "Send to Kitchen", "إرسال للمطبخ")}
                </Button>
                {paymentsEnabled && (
                  <Button
                    onClick={() => submitOrder(true)}
                    disabled={mutation.isPending || cart.length === 0}
                  >
                    <CreditCard className="size-4" />
                    {t("ثبت و تسویه فوری", "Pay & Settle Now", "دفع وتسوية فورية")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Unpaid Orders Queue */}
          {ordersEnabled && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="size-4 text-primary" />
                  {t(
                    "سفارش‌های باز سالن و بیرون‌بر",
                    "Open Active Orders",
                    "الطلبات النشطة المفتوحة",
                  )}
                  <Badge variant="secondary">{formatNumber(activeOrders.length)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {activeOrders.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {t(
                      "سفارش باز تسویه‌نشده‌ای وجود ندارد.",
                      "No open unpaid orders.",
                      "لا توجد طلبات مفتوحة.",
                    )}
                  </p>
                ) : (
                  activeOrders.slice(0, 8).map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>#{formatNumber(ord.order_number)}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {ord.table_name || ord.table_code || ord.order_type}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {ord.status}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-muted-foreground">
                          {ord.items
                            .map((i) => `${i.item_name}×${formatNumber(i.quantity)}`)
                            .join("، ")}
                        </p>
                        <p className="mt-0.5 font-semibold text-primary">
                          {formatMoney(ord.total)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {printersEnabled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() =>
                              mutation.mutate({ type: "reprint_order", order_id: ord.id })
                            }
                            title={t("چاپ مجدد فیش", "Reprint Ticket", "إعادة طباعة")}
                          >
                            <Printer className="size-3.5" />
                          </Button>
                        )}
                        {paymentsEnabled && (
                          <Button
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => openSettleDialog(ord)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            {t("تسویه", "Settle", "تسوية")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Settlement Dialog for Open Orders */}
      <Dialog open={Boolean(settlingOrder)} onOpenChange={(o) => !o && setSettlingOrder(null)}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              {t("تسویه حساب سفارش", "Settle Order", "تسوية حساب الطلب")}{" "}
              {settlingOrder ? `#${formatNumber(settlingOrder.order_number)}` : ""}
            </DialogTitle>
          </DialogHeader>
          {settlingOrder && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-sm">
                <span>
                  {settlingOrder.table_name ||
                    settlingOrder.table_code ||
                    settlingOrder.customer_name}
                </span>
                <span className="text-base font-extrabold text-primary">
                  {formatMoney(settlingOrder.total)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label>{t("روش پرداخت", "Payment Method", "طريقة الدفع")}</Label>
                <Select
                  value={settleMethod}
                  onValueChange={(v) =>
                    setSettleMethod(v as "card" | "cash" | "zarinpal" | "zibal")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">
                      {t("کارتخوان (POS)", "Card Terminal (POS)", "جهاز البطاقة (POS)")}
                    </SelectItem>
                    <SelectItem value="cash">{t("نقدی", "Cash", "نقدي")}</SelectItem>
                    <SelectItem value="zarinpal">
                      {t("زرین‌پال", "Zarinpal", "زرين بال")}
                    </SelectItem>
                    <SelectItem value="zibal">{t("زیبال", "Zibal", "زيبال")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settleMethod === "card" && (
                <div className="space-y-1.5">
                  <Label className="font-bold">
                    {t(
                      "شماره پرداخت فیش کارتخوان (POS) *",
                      "POS Terminal Receipt Number *",
                      "رقم إيصال جهاز الدفع (POS) *",
                    )}
                  </Label>
                  <Input
                    dir="ltr"
                    value={settleReceiptNumber}
                    onChange={(e) => setSettleReceiptNumber(toEnglishDigits(e.target.value))}
                    placeholder={t(
                      "شماره فیش یا پیگیری کارتخوان را وارد کنید…",
                      "Enter POS receipt/tracking number…",
                      "أدخل رقم إيصال الدفع…",
                    )}
                    className="font-mono"
                  />
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSettlingOrder(null)}>
                  {t("انصراف", "Cancel", "إلغاء")}
                </Button>
                <Button onClick={confirmSettleActiveOrder} disabled={mutation.isPending}>
                  <CheckCircle2 className="size-4" />
                  {t("ثبت تسویه نهایی", "Confirm Settlement", "تأكيد التسوية")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
