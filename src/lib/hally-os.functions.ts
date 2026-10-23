import { createServerFn } from "@tanstack/react-start";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  DEFAULT_HALLY_CONFIG,
  normalizeHallyConfig,
  type HallySystemConfig,
  type SmsProviderType,
} from "@/lib/feature-flags";
import { formatJalaliDateTime, toEnglishDigits } from "@/lib/jalali";
import {
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLE_LABELS,
  type CafeOrder,
  type CustomerOtpChallenge,
  type CustomerProfile,
  type CustomerSession,
  type DiningTable,
  type DiscountVoucher,
  type HallyStoreData,
  type InventoryBatch,
  type InventoryMovement,
  type LoyaltyLedgerEntry,
  type LoyaltyReward,
  type LoyaltyTier,
  type OperationalCalendarEvent,
  type OrderItemLine,
  type OrderStatus,
  type OrderType,
  type PaymentTransaction,
  type PriceApprovalEvent,
  type PricingRule,
  type PrinterDevice,
  type PrintJob,
  type RewardRedemption,
  type StaffAuditEntry,
  type StaffPermissions,
  type StaffRole,
  type StaffUser,
  type TableReservation,
} from "@/lib/hally-types";

type PersistedBundle = {
  config: HallySystemConfig;
  store: HallyStoreData;
};

const STORE_FILE = resolve(tmpdir(), "hally-os-store.json");

function createInitialBundle(): PersistedBundle {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const tables: DiningTable[] = [
    {
      id: "tbl-1",
      code: "T101A1",
      name: "میز ۱ (سالن اصلی)",
      capacity: 2,
      status: "active",
      sort_order: 1,
      area: "سالن اصلی",
      created_at: now,
    },
    {
      id: "tbl-2",
      code: "T102B2",
      name: "میز ۲ (سالن اصلی)",
      capacity: 4,
      status: "active",
      sort_order: 2,
      area: "سالن اصلی",
      created_at: now,
    },
    {
      id: "tbl-3",
      code: "T103C3",
      name: "میز ۳ (تراس)",
      capacity: 4,
      status: "active",
      sort_order: 3,
      area: "تراس",
      created_at: now,
    },
    {
      id: "tbl-4",
      code: "T104D4",
      name: "میز ۴ (تراس)",
      capacity: 6,
      status: "active",
      sort_order: 4,
      area: "تراس",
      created_at: now,
    },
    {
      id: "tbl-5",
      code: "T105V1",
      name: "میز ۵ (VIP)",
      capacity: 8,
      status: "active",
      sort_order: 5,
      area: "VIP",
      created_at: now,
    },
  ];

  const loyalty_tiers: LoyaltyTier[] = [
    {
      key: "bronze",
      name: "برنزی",
      name_en: "Bronze",
      name_ar: "برونزي",
      min_spent: 0,
      points_multiplier: 1,
      discount_pct: 0,
    },
    {
      key: "silver",
      name: "نقره‌ای",
      name_en: "Silver",
      name_ar: "فضي",
      min_spent: 15000000,
      points_multiplier: 1.25,
      discount_pct: 5,
    },
    {
      key: "gold",
      name: "طلایی",
      name_en: "Gold",
      name_ar: "ذهبي",
      min_spent: 40000000,
      points_multiplier: 1.5,
      discount_pct: 10,
    },
    {
      key: "platinum",
      name: "پلاتینیوم",
      name_en: "Platinum",
      name_ar: "بلاتيني",
      min_spent: 80000000,
      points_multiplier: 2,
      discount_pct: 15,
    },
  ];

  const customers: CustomerProfile[] = [
    {
      id: "cust-1",
      name: "سارا محمدی",
      mobile: "09121112233",
      loyalty_level: "gold",
      loyalty_points: 485,
      total_spent: 46500000,
      orders_count: 19,
      notes: "مشتری وفادار؛ لاته با شیر جو دوسر",
      created_at: now,
    },
    {
      id: "cust-2",
      name: "امیرحسین رضایی",
      mobile: "09123334455",
      loyalty_level: "silver",
      loyalty_points: 210,
      total_spent: 18900000,
      orders_count: 8,
      notes: "علاقه‌مند به قهوه دمی V60",
      created_at: now,
    },
    {
      id: "cust-3",
      name: "نگار کریمی",
      mobile: "09357778899",
      loyalty_level: "bronze",
      loyalty_points: 65,
      total_spent: 6500000,
      orders_count: 3,
      notes: "",
      created_at: now,
    },
  ];

  const vouchers: DiscountVoucher[] = [
    {
      id: "vch-1",
      code: "HALLY10",
      title: "تخفیف ۱۰٪ باشگاه مشتریان هالی",
      kind: "percent",
      value: 10,
      min_order: 1500000,
      max_discount: 1000000,
      customer_mobile: null,
      usage_limit: 100,
      used_count: 14,
      expires_at: "2027-03-20",
      status: "active",
      created_at: now,
    },
    {
      id: "vch-2",
      code: "WELCOME500",
      title: "هدیه خوش‌آمدگویی ۵۰۰,۰۰۰ ریال",
      kind: "fixed",
      value: 500000,
      min_order: 2500000,
      max_discount: 500000,
      customer_mobile: null,
      usage_limit: 50,
      used_count: 6,
      expires_at: "2027-03-20",
      status: "active",
      created_at: now,
    },
  ];

  const rewards: LoyaltyReward[] = [
    {
      id: "rew-1",
      code: "FREE-ESPRESSO",
      title: "اسپرسو دبل رایگان",
      kind: "manual",
      points_cost: 120,
      reward_value: 950000,
      stock: 50,
      redeemed_count: 9,
      status: "active",
      description: "یک شات اسپرسو دبل تخصصی رایگان در سفارش بعدی",
    },
    {
      id: "rew-2",
      code: "CAKE-VOUCHER",
      title: "کوپن ۱,۵۰۰,۰۰۰ ریال کیک و دسر",
      kind: "voucher",
      points_cost: 200,
      reward_value: 1500000,
      stock: 30,
      redeemed_count: 4,
      status: "active",
      description: "تخفیف مستقیم روی تمامی کیک‌ها و دسرهای روز",
    },
    {
      id: "rew-3",
      code: "VIP-BREAKFAST",
      title: "صبحانه ویژه هالی برای ۲ نفر",
      kind: "manual",
      points_cost: 600,
      reward_value: 5500000,
      stock: 15,
      redeemed_count: 2,
      status: "active",
      description: "پکیج کامل صبحانه ویژه کافه رستوران هالی",
    },
  ];

  const printers: PrinterDevice[] = [
    {
      id: "prn-1",
      name: "چاپگر بار گرم و سرد",
      station: "bar",
      order_type: "all",
      paper_width: 80,
      copies: 1,
      mode: "auto",
      status: "active",
    },
    {
      id: "prn-2",
      name: "چاپگر آشپزخانه مرکزی",
      station: "kitchen",
      order_type: "all",
      paper_width: 80,
      copies: 1,
      mode: "auto",
      status: "active",
    },
    {
      id: "prn-3",
      name: "چاپگر فیش صندوق",
      station: "receipt",
      order_type: "all",
      paper_width: 80,
      copies: 2,
      mode: "auto",
      status: "active",
    },
  ];

  const reservations: TableReservation[] = [
    {
      id: "res-1",
      customer_name: "سارا محمدی",
      customer_phone: "09121112233",
      table_id: "tbl-3",
      table_name: "میز ۳ (تراس)",
      reservation_date: today,
      start_time: "19:30",
      duration_min: 90,
      guests: 4,
      status: "confirmed",
      notes: "تولد؛ درخواست میز کنار پنجره",
      created_at: now,
    },
    {
      id: "res-2",
      customer_name: "کیوان شریفی",
      customer_phone: "09129876543",
      table_id: "tbl-5",
      table_name: "میز ۵ (VIP)",
      reservation_date: today,
      start_time: "21:00",
      duration_min: 120,
      guests: 6,
      status: "reserved",
      notes: "جلسه کاری",
      created_at: now,
    },
  ];

  const pricing_rules: PricingRule[] = [
    {
      id: "pr-1",
      scope: "global",
      entity_id: null,
      entity_name: "قانون پیش‌فرض کل منو",
      margin_type: "percentage",
      margin_value: 65,
      round_to: 10000,
      is_active: true,
      created_at: now,
    },
  ];

  const calendar_events: OperationalCalendarEvent[] = [
    {
      id: "cal-1",
      title: "تحویل دانه قهوه تخصصی (برشته‌کاری)",
      event_type: "supplier_delivery",
      starts_at: `${today}T10:00`,
      ends_at: `${today}T11:30`,
      status: "scheduled",
      notes: "بررسی رطوبت و تاریخ رست",
    },
    {
      id: "cal-2",
      title: "شمارش فیزیکی هفتگی انبار بار گرم",
      event_type: "staff",
      starts_at: `${today}T23:00`,
      ends_at: `${today}T23:59`,
      status: "scheduled",
      notes: "توسط سرپرست شیفت شب",
    },
  ];

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();

  const initialOrders: CafeOrder[] = [
    {
      id: "ord-seed-1001",
      order_number: 1001,
      token: "hally-inv-1001",
      order_type: "dine_in",
      table_code: "T103C3",
      table_name: "میز ۳ (تراس)",
      customer_id: "cust-1",
      customer_name: "سارا محمدی",
      customer_phone: "09121112233",
      status: "paid",
      station: "both",
      items: [
        {
          menu_item_id: "seed-latte",
          item_name: "لاته تخصصی هالی",
          unit_price: 1450000,
          unit_cost: 420000,
          quantity: 2,
          line_total: 2900000,
          option_label: "شیر جو دوسر",
        },
        {
          menu_item_id: "seed-cheesecake",
          item_name: "چیزکیک سن‌سباستین",
          unit_price: 2100000,
          unit_cost: 680000,
          quantity: 1,
          line_total: 2100000,
        },
      ],
      subtotal: 5000000,
      discount_code: "HALLY10",
      discount_amount: 500000,
      tax_amount: 0,
      total: 4500000,
      payment_method: "zarinpal",
      notes: "سرو همزمان قهوه و دسر",
      sales_synced: true,
      stock_consumed: true,
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
    },
    {
      id: "ord-seed-1002",
      order_number: 1002,
      token: "hally-inv-1002",
      order_type: "takeaway",
      table_code: null,
      table_name: null,
      customer_id: "cust-1",
      customer_name: "سارا محمدی",
      customer_phone: "09121112233",
      status: "paid",
      station: "bar",
      items: [
        {
          menu_item_id: "seed-v60",
          item_name: "قهوه دمی V60 اتیوپی",
          unit_price: 1850000,
          unit_cost: 550000,
          quantity: 1,
          line_total: 1850000,
        },
        {
          menu_item_id: "seed-croissant",
          item_name: "کروسان کره‌ای فرانسوی",
          unit_price: 1150000,
          unit_cost: 350000,
          quantity: 2,
          line_total: 2300000,
        },
      ],
      subtotal: 4150000,
      discount_code: null,
      discount_amount: 0,
      tax_amount: 0,
      total: 4150000,
      payment_method: "card",
      notes: "بسته‌بندی بیرون‌بر",
      sales_synced: true,
      stock_consumed: true,
      created_at: fiveDaysAgo,
      updated_at: fiveDaysAgo,
    },
    {
      id: "ord-seed-1003",
      order_number: 1003,
      token: "hally-inv-1003",
      order_type: "dine_in",
      table_code: "T101A1",
      table_name: "میز ۱ (سالن اصلی)",
      customer_id: "cust-2",
      customer_name: "امیرحسین رضایی",
      customer_phone: "09123334455",
      status: "paid",
      station: "bar",
      items: [
        {
          menu_item_id: "seed-espresso",
          item_name: "اسپرسو دبل عربیکا",
          unit_price: 980000,
          unit_cost: 280000,
          quantity: 2,
          line_total: 1960000,
        },
      ],
      subtotal: 1960000,
      discount_code: null,
      discount_amount: 0,
      tax_amount: 0,
      total: 1960000,
      payment_method: "card",
      notes: "",
      sales_synced: true,
      stock_consumed: true,
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
    },
  ];

  const staff_users: StaffUser[] = [
    {
      id: "stf-admin",
      name: "مدیر کل هالی",
      username: "admin",
      pin: "1234",
      phone: "09120000001",
      role: "admin",
      permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin },
      is_active: true,
      created_at: now,
    },
    {
      id: "stf-waiter-1",
      name: "علی رضایی (ویترس سالن)",
      username: "waiter1",
      pin: "1111",
      phone: "09120000002",
      role: "waiter",
      permissions: {
        ...DEFAULT_ROLE_PERMISSIONS.waiter,
        canEditOrder: true,
        canDeleteOrder: true,
      },
      is_active: true,
      created_at: now,
    },
    {
      id: "stf-waiter-2",
      name: "مریم کاظمی (ویترس تراس)",
      username: "waiter2",
      pin: "2222",
      phone: "09120000003",
      role: "waiter",
      permissions: {
        ...DEFAULT_ROLE_PERMISSIONS.waiter,
        canEditOrder: false,
        canDeleteOrder: false,
      },
      is_active: true,
      created_at: now,
    },
    {
      id: "stf-cashier",
      name: "حسین امینی (صندوقدار)",
      username: "cashier",
      pin: "3333",
      phone: "09120000004",
      role: "cashier",
      permissions: { ...DEFAULT_ROLE_PERMISSIONS.cashier },
      is_active: true,
      created_at: now,
    },
    {
      id: "stf-chef",
      name: "امید نادری (سرآشپز)",
      username: "chef",
      pin: "4444",
      phone: "09120000005",
      role: "chef",
      permissions: { ...DEFAULT_ROLE_PERMISSIONS.chef },
      is_active: true,
      created_at: now,
    },
  ];

  const audit_entries: StaffAuditEntry[] = [
    {
      id: "aud-seed-1",
      user_id: "stf-waiter-1",
      user_name: "علی رضایی (ویترس سالن)",
      user_role: "ویترس / سالن‌دار",
      action: "create_pos_order",
      entity: "order",
      entity_id: "ord-seed-1001",
      summary: "ثبت سفارش #1001 برای میز ۳ (تراس) به مبلغ ۴,۵۰۰,۰۰۰ ریال",
      details: { order_number: 1001, table_name: "میز ۳ (تراس)", total: 4500000 },
      created_at: twoDaysAgo,
    },
  ];

  return {
    config: DEFAULT_HALLY_CONFIG,
    store: {
      next_order_number: 1004,
      tables,
      orders: initialOrders,
      reservations,
      customers,
      loyalty_tiers,
      loyalty_ledger: [
        {
          id: "led-1",
          customer_id: "cust-1",
          customer_name: "سارا محمدی",
          customer_mobile: "09121112233",
          delta: 485,
          balance_after: 485,
          reason: "order_earn",
          note: "امتیاز تجمعی خریدهای قبلی",
          created_at: now,
        },
        {
          id: "led-2",
          customer_id: "cust-2",
          customer_name: "امیرحسین رضایی",
          customer_mobile: "09123334455",
          delta: 210,
          balance_after: 210,
          reason: "order_earn",
          note: "امتیاز تجمعی خریدهای قبلی",
          created_at: now,
        },
      ],
      vouchers,
      rewards,
      reward_redemptions: [],
      printers,
      print_jobs: [],
      payments: [],
      inventory_movements: [],
      inventory_batches: [],
      pricing_rules,
      price_proposals: [],
      calendar_events,
      otp_challenges: [],
      customer_sessions: [],
      staff_users,
      audit_entries,
    },
  };
}

function readBundle(): PersistedBundle {
  try {
    if (existsSync(STORE_FILE)) {
      const raw = readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<PersistedBundle>;
      const initial = createInitialBundle();
      const mergedStore: HallyStoreData = {
        ...initial.store,
        ...(parsed.store ?? {}),
      };
      if (!Array.isArray(mergedStore.orders) || mergedStore.orders.length === 0) {
        mergedStore.orders = initial.store.orders;
        mergedStore.next_order_number = Math.max(mergedStore.next_order_number || 1001, 1004);
      }
      if (!Array.isArray(mergedStore.otp_challenges)) {
        mergedStore.otp_challenges = [];
      }
      if (!Array.isArray(mergedStore.customer_sessions)) {
        mergedStore.customer_sessions = [];
      }
      if (!Array.isArray(mergedStore.staff_users) || mergedStore.staff_users.length === 0) {
        mergedStore.staff_users = initial.store.staff_users;
      }
      if (!Array.isArray(mergedStore.audit_entries)) {
        mergedStore.audit_entries = initial.store.audit_entries;
      }
      return {
        config: normalizeHallyConfig(parsed.config),
        store: mergedStore,
      };
    }
  } catch (err) {
    console.error("Failed reading hally-os-store.json:", err);
  }
  const fresh = createInitialBundle();
  writeBundle(fresh);
  return fresh;
}

function writeBundle(bundle: PersistedBundle): void {
  try {
    const dir = dirname(STORE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STORE_FILE, JSON.stringify(bundle, null, 2), "utf8");
  } catch (err) {
    console.error("Failed writing hally-os-store.json:", err);
  }
}

function evaluateTier(
  totalSpent: number,
  tiers: LoyaltyTier[],
): "bronze" | "silver" | "gold" | "platinum" {
  const sorted = [...tiers].sort((a, b) => b.min_spent - a.min_spent);
  for (const tier of sorted) {
    if (totalSpent >= tier.min_spent) {
      return tier.key;
    }
  }
  return "bronze";
}

function buildTicketPayload(order: CafeOrder, stationLabel: string): string {
  const lines = [
    "========================================",
    `        کافه رستوران هالی - ${stationLabel}`,
    "========================================",
    `شماره سفارش: #${order.order_number}`,
    `نوع: ${
      order.order_type === "dine_in"
        ? `سالن (${order.table_name || order.table_code || "—"})`
        : order.order_type === "takeaway"
          ? "بیرون‌بر"
          : "ارسال با پیک"
    }`,
    `مشتری: ${order.customer_name || "مهمان"}`,
    `زمان: ${formatJalaliDateTime(order.created_at, "fa")}`,
    "----------------------------------------",
    ...order.items.map(
      (it) =>
        `${it.item_name}${it.option_label ? ` (${it.option_label})` : ""} × ${it.quantity}   ${Math.round(it.line_total).toLocaleString("fa-IR")}`,
    ),
    "----------------------------------------",
    `جمع جزء: ${Math.round(order.subtotal).toLocaleString("fa-IR")}`,
    ...(order.discount_amount > 0
      ? [
          `تخفیف (${order.discount_code || ""}): -${Math.round(order.discount_amount).toLocaleString("fa-IR")}`,
        ]
      : []),
    ...(order.tax_amount > 0
      ? [`مالیات: ${Math.round(order.tax_amount).toLocaleString("fa-IR")}`]
      : []),
    `مبلغ قابل پرداخت: ${Math.round(order.total).toLocaleString("fa-IR")}`,
    ...(order.payment_reference ? [`شماره پرداخت فیش (POS): ${order.payment_reference}`] : []),
    "========================================",
  ];
  return lines.join("\n");
}

function enqueueOrderPrintJobs(store: HallyStoreData, order: CafeOrder): void {
  const activePrinters = store.printers.filter((p) => p.status === "active");
  for (const printer of activePrinters) {
    if (printer.order_type !== "all" && printer.order_type !== order.order_type) {
      continue;
    }
    const stationLabel =
      printer.station === "kitchen" ? "آشپزخانه" : printer.station === "bar" ? "بار" : "رسید مشتری";
    const job: PrintJob = {
      id: `pj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      order_id: order.id,
      order_number: order.order_number,
      printer_id: printer.id,
      printer_name: printer.name,
      station: printer.station,
      ticket_type: printer.station,
      copies: printer.copies,
      status: "pending",
      payload: buildTicketPayload(order, stationLabel),
      created_at: new Date().toISOString(),
      delivered_at: null,
    };
    store.print_jobs.unshift(job);
  }
}

export const getHallyFullBundle = createServerFn({ method: "GET" }).handler(
  async (): Promise<PersistedBundle> => {
    return readBundle();
  },
);

export type PublicHallyContext = {
  config: HallySystemConfig;
  tables: Array<{ id: string; code: string; name: string; capacity: number; area: string }>;
  loyalty_tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  active_vouchers: Array<{
    code: string;
    title: string;
    kind: "percent" | "fixed";
    value: number;
    min_order: number;
  }>;
};

export const getPublicHallyContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicHallyContext> => {
    const { config, store } = readBundle();
    const safePublicConfig: HallySystemConfig = {
      ...config,
      mediana_api_key: "",
      melipayamak_password: "",
      zarinpal_merchant_id: "",
      zibal_merchant_id: "",
    };
    const tablesEnabled = config.features.tables !== false;
    const loyaltyEnabled =
      config.features.loyalty !== false && config.features.public_loyalty !== false;
    const rewardsEnabled = loyaltyEnabled && config.features.rewards !== false;
    const vouchersEnabled = config.features.vouchers !== false;

    return {
      config: safePublicConfig,
      tables: tablesEnabled
        ? store.tables
            .filter((t) => t.status === "active")
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((t) => ({
              id: t.id,
              code: t.code,
              name: t.name,
              capacity: t.capacity,
              area: t.area,
            }))
        : [],
      loyalty_tiers: loyaltyEnabled ? store.loyalty_tiers : [],
      rewards: rewardsEnabled
        ? store.rewards.filter((r) => r.status === "active" && r.stock > 0)
        : [],
      active_vouchers: vouchersEnabled
        ? store.vouchers
            .filter((v) => v.status === "active" && !v.customer_mobile)
            .map((v) => ({
              code: v.code,
              title: v.title,
              kind: v.kind,
              value: v.value,
              min_order: v.min_order,
            }))
        : [],
    };
  },
);

export type PublicOrderView = {
  order_number: number;
  token: string;
  order_type: OrderType;
  table_code: string | null;
  table_name: string | null;
  status: OrderStatus;
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    option_label?: string | undefined;
  }>;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  created_at: string;
};

export const getPublicOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    return { token: String(input?.token ?? "").trim() };
  })
  .handler(async ({ data }): Promise<PublicOrderView | null> => {
    if (!data.token) return null;
    const { store } = readBundle();
    const found = store.orders.find((o) => o.token === data.token);
    if (!found) return null;
    return {
      order_number: found.order_number,
      token: found.token,
      order_type: found.order_type,
      table_code: found.table_code,
      table_name: found.table_name,
      status: found.status,
      items: found.items.map((i) => ({
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
        option_label: i.option_label,
      })),
      subtotal: found.subtotal,
      discount_amount: found.discount_amount,
      tax_amount: found.tax_amount,
      total: found.total,
      created_at: found.created_at,
    };
  });

export type CreatePublicOrderInput = {
  order_type: OrderType;
  table_code?: string | null;
  customer_name?: string;
  customer_phone?: string;
  discount_code?: string;
  notes?: string;
  items: Array<{
    menu_item_id: string;
    item_name: string;
    unit_price: number;
    unit_cost?: number;
    quantity: number;
    option_label?: string;
  }>;
};

export const createPublicOrder = createServerFn({ method: "POST" })
  .inputValidator((input: CreatePublicOrderInput) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      token: string;
      order_number: number;
      total: number;
      discount_amount: number;
    }> => {
      const bundle = readBundle();
      const { config, store } = bundle;

      if (config.features.online_ordering === false || config.features.orders === false) {
        throw new Error("امکان ثبت سفارش آنلاین در حال حاضر غیرفعال است");
      }

      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("سبد خرید خالی است");
      }

      const lines: OrderItemLine[] = data.items
        .filter((it) => it.quantity > 0)
        .map((it) => ({
          menu_item_id: it.menu_item_id,
          item_name: it.item_name,
          unit_price: Number(it.unit_price) || 0,
          unit_cost: Number(it.unit_cost) || 0,
          quantity: Number(it.quantity) || 1,
          line_total: (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
          option_label: it.option_label,
        }));

      const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
      let discountAmount = 0;
      let appliedCode: string | null = null;

      const rawCode = (data.discount_code ?? "").trim().toUpperCase();
      if (rawCode && config.features.vouchers !== false) {
        const voucher = store.vouchers.find(
          (v) => v.code.toUpperCase() === rawCode && v.status === "active",
        );
        if (!voucher) {
          throw new Error("کد تخفیف معتبر نیست یا منقضی شده است");
        }
        if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit) {
          throw new Error("ظرفیت استفاده از این کد تخفیف تکمیل شده است");
        }
        if (voucher.min_order > 0 && subtotal < voucher.min_order) {
          throw new Error(
            `حداقل مبلغ سفارش برای این کد ${voucher.min_order.toLocaleString("fa-IR")} است`,
          );
        }
        if (voucher.kind === "percent") {
          discountAmount = Math.round((subtotal * voucher.value) / 100);
          if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
            discountAmount = voucher.max_discount;
          }
        } else {
          discountAmount = Math.min(subtotal, voucher.value);
        }
        voucher.used_count += 1;
        appliedCode = voucher.code;
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const taxAmount =
        config.tax_enabled && !config.tax_inclusive
          ? Math.round((afterDiscount * config.tax_rate) / 100)
          : 0;
      const total = afterDiscount + taxAmount;

      const matchedTable =
        config.features.tables !== false && data.table_code
          ? store.tables.find((t) => t.code === data.table_code)
          : null;

      const phone = (data.customer_phone ?? "").trim();
      const name = (data.customer_name ?? "").trim();
      let customerId: string | null = null;

      if (phone && config.features.customers !== false) {
        let cust = store.customers.find((c) => c.mobile === phone);
        if (!cust) {
          cust = {
            id: `cust-${Date.now()}`,
            name: name || "مشتری جدید",
            mobile: phone,
            loyalty_level: "bronze",
            loyalty_points: 0,
            total_spent: 0,
            orders_count: 0,
            notes: "ثبت‌شده از سفارش آنلاین",
            created_at: new Date().toISOString(),
          };
          store.customers.unshift(cust);
        } else if (name && cust.name === "مشتری جدید") {
          cust.name = name;
        }
        customerId = cust.id;
      }

      const orderNumber = store.next_order_number++;
      const token =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);

      const newOrder: CafeOrder = {
        id: `ord-${Date.now()}`,
        order_number: orderNumber,
        token,
        order_type: data.order_type || (matchedTable ? "dine_in" : "takeaway"),
        table_code: matchedTable?.code ?? data.table_code ?? null,
        table_name: matchedTable?.name ?? null,
        customer_id: customerId,
        customer_name: name || "مهمان",
        customer_phone: phone,
        status: "pending",
        station: "both",
        items: lines,
        subtotal,
        discount_code: appliedCode,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total,
        payment_method: "unpaid",
        notes: (data.notes ?? "").trim(),
        sales_synced: false,
        stock_consumed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.orders.unshift(newOrder);
      if (config.features.printers !== false) {
        enqueueOrderPrintJobs(store, newOrder);
      }
      writeBundle(bundle);

      return {
        token,
        order_number: orderNumber,
        total,
        discount_amount: discountAmount,
      };
    },
  );

export const createPublicReservation = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      customer_name: string;
      customer_phone: string;
      table_id?: string | null;
      reservation_date: string;
      start_time: string;
      duration_min?: number;
      guests: number;
      notes?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<TableReservation> => {
    const bundle = readBundle();
    const { config, store } = bundle;
    if (config.features.public_reservation === false || config.features.reservations === false) {
      throw new Error("امکان رزرو میز در حال حاضر غیرفعال است");
    }
    const table =
      config.features.tables !== false && data.table_id
        ? store.tables.find((t) => t.id === data.table_id)
        : null;
    const res: TableReservation = {
      id: `res-${Date.now()}`,
      customer_name: data.customer_name.trim(),
      customer_phone: data.customer_phone.trim(),
      table_id: table?.id ?? null,
      table_name: table?.name ?? "تخصیص توسط کافه",
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      duration_min: Number(data.duration_min) || 90,
      guests: Number(data.guests) || 2,
      status: "reserved",
      notes: (data.notes ?? "").trim(),
      created_at: new Date().toISOString(),
    };
    store.reservations.unshift(res);
    writeBundle(bundle);
    return res;
  });

export const lookupOrJoinLoyalty = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; name?: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      customer: CustomerProfile;
      tiers: LoyaltyTier[];
      rewards: LoyaltyReward[];
    }> => {
      const mobile = (data.mobile ?? "").trim();
      if (!mobile) throw new Error("شماره موبایل الزامی است");
      const bundle = readBundle();
      const { store } = bundle;
      let customer = store.customers.find((c) => c.mobile === mobile);
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          name: (data.name ?? "").trim() || "عضو باشگاه هالی",
          mobile,
          loyalty_level: "bronze",
          loyalty_points: 20,
          total_spent: 0,
          orders_count: 0,
          notes: "عضویت از طریق پورتال باشگاه مشتریان",
          created_at: new Date().toISOString(),
        };
        store.customers.unshift(customer);
        store.loyalty_ledger.unshift({
          id: `led-${Date.now()}`,
          customer_id: customer.id,
          customer_name: customer.name,
          customer_mobile: customer.mobile,
          delta: 20,
          balance_after: 20,
          reason: "manual",
          note: "هدیه خوش‌آمدگویی عضویت در باشگاه مشتریان",
          created_at: new Date().toISOString(),
        });
        writeBundle(bundle);
      } else if (data.name && data.name.trim()) {
        customer.name = data.name.trim();
        writeBundle(bundle);
      }
      return {
        customer,
        tiers: store.loyalty_tiers,
        rewards: store.rewards.filter((r) => r.status === "active"),
      };
    },
  );

function normalizeIranMobile(raw: string): string {
  const digits = toEnglishDigits(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("989") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

async function dispatchOtpSmsViaGateway(params: {
  config: HallySystemConfig;
  provider: SmsProviderType;
  mobile: string;
  code: string;
}): Promise<{ delivered_live: boolean; provider: SmsProviderType; gateway_message: string }> {
  const { config, provider, mobile, code } = params;

  if (provider === "mediana") {
    const apiKey = config.mediana_api_key.trim();
    const patternCode = config.mediana_pattern_code.trim();
    const sender = config.mediana_sender_number.trim() || "3000505";

    if (apiKey && patternCode && !config.sms_sandbox_mode) {
      try {
        const res = await fetch("https://api2.ippanel.com/api/v1/sms/pattern/normal/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            code: patternCode,
            sender,
            recipient: mobile,
            variable: {
              "verification-code": code,
              code,
            },
          }),
        });
        if (res.ok) {
          return {
            delivered_live: true,
            provider: "mediana",
            gateway_message: "کد تایید از طریق درگاه پیامکی مدیانا ارسال شد.",
          };
        }
      } catch (err) {
        console.warn("Mediana SMS gateway fallback to sandbox:", err);
      }
    }
    return {
      delivered_live: false,
      provider: "mediana",
      gateway_message: "کد یکبارمصرف از طریق سرویس مدیانا (حالت آزمایشی/پیش‌نمایش) صادر شد.",
    };
  }

  // MeliPayamak
  const username = config.melipayamak_username.trim();
  const password = config.melipayamak_password.trim();
  const bodyId = Number(config.melipayamak_body_id.trim());

  if (username && password && bodyId && !config.sms_sandbox_mode) {
    try {
      const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          text: code,
          to: mobile,
          bodyId,
        }),
      });
      if (res.ok) {
        return {
          delivered_live: true,
          provider: "melipayamak",
          gateway_message: "کد تایید از طریق درگاه ملی پیامک ارسال شد.",
        };
      }
    } catch (err) {
      console.warn("MeliPayamak SMS gateway fallback to sandbox:", err);
    }
  }

  return {
    delivered_live: false,
    provider: "melipayamak",
    gateway_message: "کد یکبارمصرف از طریق سرویس ملی پیامک (حالت آزمایشی/پیش‌نمایش) صادر شد.",
  };
}

async function dispatchReservationSmsViaGateway(params: {
  config: HallySystemConfig;
  mobile: string;
  customerName: string;
  reservationDate: string;
  startTime: string;
  tableName: string;
  status: "confirmed" | "cancelled";
}): Promise<{ delivered_live: boolean; provider: SmsProviderType; message_text: string }> {
  const { config, mobile, customerName, reservationDate, startTime, tableName, status } = params;
  const provider: SmsProviderType = config.sms_provider || "mediana";
  const jalaliDate = formatJalaliDateTime(`${reservationDate}T${startTime || "12:00"}`, "fa");
  const messageText =
    status === "confirmed"
      ? `${customerName} عزیز، رزرو میز شما (${tableName}) در کافه رستوران هالی برای زمان ${jalaliDate} با موفقیت تأیید شد. منتظر دیدار شما هستیم.`
      : `${customerName} عزیز، متأسفانه امکان تأیید رزرو میز (${tableName}) برای زمان ${jalaliDate} در کافه رستوران هالی فراهم نشد و رزرو لغو گردید.`;

  if (provider === "mediana") {
    const apiKey = config.mediana_api_key.trim();
    const sender = config.mediana_sender_number.trim() || "3000505";
    const patternCode = config.mediana_pattern_reservation.trim();
    if (apiKey && !config.sms_sandbox_mode) {
      try {
        if (patternCode) {
          const res = await fetch("https://api2.ippanel.com/api/v1/sms/pattern/normal/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: apiKey },
            body: JSON.stringify({
              code: patternCode,
              sender,
              recipient: normalizeIranMobile(mobile),
              variable: {
                name: customerName,
                date: jalaliDate,
                table: tableName,
              },
            }),
          });
          if (res.ok) {
            return { delivered_live: true, provider, message_text: messageText };
          }
        }
        const res = await fetch("https://api2.ippanel.com/api/v1/sms/send/webservice/single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            recipient: [normalizeIranMobile(mobile)],
            sender,
            message: messageText,
          }),
        });
        if (res.ok) {
          return { delivered_live: true, provider, message_text: messageText };
        }
      } catch (err) {
        console.warn("Mediana reservation SMS fallback:", err);
      }
    }
    return { delivered_live: false, provider, message_text: messageText };
  }

  const username = config.melipayamak_username.trim();
  const password = config.melipayamak_password.trim();
  const bodyId = Number(config.melipayamak_body_id_reservation.trim());
  if (username && password && !config.sms_sandbox_mode) {
    try {
      if (bodyId) {
        const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            text: `${customerName};${tableName};${jalaliDate}`,
            to: normalizeIranMobile(mobile),
            bodyId,
          }),
        });
        if (res.ok) {
          return { delivered_live: true, provider, message_text: messageText };
        }
      }
      const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          to: normalizeIranMobile(mobile),
          from: config.melipayamak_sender_number.trim() || "50004001",
          text: messageText,
          isFlash: false,
        }),
      });
      if (res.ok) {
        return { delivered_live: true, provider, message_text: messageText };
      }
    } catch (err) {
      console.warn("MeliPayamak reservation SMS fallback:", err);
    }
  }

  return { delivered_live: false, provider, message_text: messageText };
}

export const verifyStaffCredentials = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; pin: string }) => input)
  .handler(async ({ data }): Promise<StaffUser> => {
    const username = toEnglishDigits(data.username ?? "")
      .trim()
      .toLowerCase();
    const pin = toEnglishDigits(data.pin ?? "").trim();
    if (!username || !pin) {
      throw new Error("نام کاربری و رمز / پین ورود الزامی است");
    }
    const bundle = readBundle();
    const { store } = bundle;
    const found = (store.staff_users ?? []).find(
      (u) => u.is_active && u.username.toLowerCase() === username && u.pin === pin,
    );
    if (!found) {
      throw new Error("نام کاربری یا کد پین اشتباه است یا حساب غیرفعال شده است");
    }
    store.audit_entries = store.audit_entries ?? [];
    store.audit_entries.unshift({
      id: `aud-${Date.now()}`,
      user_id: found.id,
      user_name: found.name,
      user_role: STAFF_ROLE_LABELS[found.role] || found.role,
      action: "staff_login",
      entity: "auth",
      entity_id: found.id,
      summary: `ورود به سیستم توسط «${found.name}» (${STAFF_ROLE_LABELS[found.role]})`,
      details: { username: found.username, role: found.role },
      created_at: new Date().toISOString(),
    });
    writeBundle(bundle);
    return found;
  });

export const requestStaffOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; provider?: SmsProviderType }) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      mobile: string;
      staff_name: string;
      staff_role: string;
      expires_in_sec: number;
      delivered_live: boolean;
      gateway_message: string;
      sandbox_code?: string;
    }> => {
      const mobile = normalizeIranMobile(data.mobile);
      if (!/^09\d{9}$/.test(mobile)) {
        throw new Error("شماره موبایل پرسنل معتبر نیست (مثال: 09120000001)");
      }
      const bundle = readBundle();
      const { config, store } = bundle;

      const staff = (store.staff_users ?? []).find(
        (u) => u.is_active && normalizeIranMobile(u.phone) === mobile,
      );
      if (!staff) {
        throw new Error(
          "شماره موبایل وارد شده در لیست پرسنل فعال کافه هالی ثبت نشده است. لطفاً با مدیر سیستم تماس بگیرید.",
        );
      }

      const provider: SmsProviderType =
        data.provider === "melipayamak" || data.provider === "mediana"
          ? data.provider
          : config.sms_provider || "mediana";

      const code = String(Math.floor(10000 + Math.random() * 90000));
      const nowMs = Date.now();
      const expiresAt = new Date(nowMs + 3 * 60 * 1000).toISOString();

      store.otp_challenges = (store.otp_challenges ?? []).filter(
        (c) => c.mobile !== mobile && new Date(c.expires_at).getTime() > nowMs,
      );

      const challenge: CustomerOtpChallenge = {
        id: `stf-otp-${nowMs}`,
        mobile,
        code,
        provider,
        expires_at: expiresAt,
        verified: false,
        created_at: new Date(nowMs).toISOString(),
      };
      store.otp_challenges.unshift(challenge);
      writeBundle(bundle);

      const dispatchResult = await dispatchOtpSmsViaGateway({
        config,
        provider,
        mobile,
        code,
      });

      return {
        mobile,
        staff_name: staff.name,
        staff_role: STAFF_ROLE_LABELS[staff.role] ?? staff.role,
        expires_in_sec: 180,
        delivered_live: dispatchResult.delivered_live,
        gateway_message: dispatchResult.gateway_message,
        sandbox_code: dispatchResult.delivered_live ? undefined : code,
      };
    },
  );

export const verifyStaffOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; code: string }) => input)
  .handler(async ({ data }): Promise<StaffUser> => {
    const mobile = normalizeIranMobile(data.mobile);
    const code = toEnglishDigits(data.code ?? "").trim();
    if (!mobile || !code) {
      throw new Error("شماره موبایل و کد یکبارمصرف الزامی است");
    }

    const bundle = readBundle();
    const { store } = bundle;
    const nowMs = Date.now();

    const challenges = store.otp_challenges ?? [];
    const matched = challenges.find(
      (c) =>
        c.mobile === mobile &&
        c.code === code &&
        !c.verified &&
        new Date(c.expires_at).getTime() >= nowMs,
    );

    if (!matched) {
      throw new Error("کد یکبارمصرف پرسنل نامعتبر یا منقضی شده است");
    }

    matched.verified = true;

    const staff = (store.staff_users ?? []).find(
      (u) => u.is_active && normalizeIranMobile(u.phone) === mobile,
    );
    if (!staff) {
      throw new Error("کاربر پرسنل یافت نشد یا حساب کاربری غیرفعال است");
    }

    store.audit_entries = store.audit_entries ?? [];
    store.audit_entries.unshift({
      id: `aud-${Date.now()}`,
      user_id: staff.id,
      user_name: staff.name,
      user_role: STAFF_ROLE_LABELS[staff.role] || staff.role,
      action: "staff_otp_login",
      entity: "auth",
      entity_id: staff.id,
      summary: `ورود با کد یکبارمصرف پیامکی (OTP) توسط «${staff.name}» (${STAFF_ROLE_LABELS[staff.role]})`,
      details: { phone: staff.phone, role: staff.role },
      created_at: new Date().toISOString(),
    });

    writeBundle(bundle);
    return staff;
  });

export type CustomerPortalData = {
  session_token: string;
  customer: CustomerProfile;
  orders: CafeOrder[];
  reservations: TableReservation[];
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  vouchers: DiscountVoucher[];
  ledger: LoyaltyLedgerEntry[];
  redemptions: RewardRedemption[];
};

function buildCustomerPortalPayload(
  store: HallyStoreData,
  customer: CustomerProfile,
  sessionToken: string,
): CustomerPortalData {
  const mobile = normalizeIranMobile(customer.mobile);
  const customerOrders = store.orders
    .filter(
      (o) => o.customer_id === customer.id || normalizeIranMobile(o.customer_phone) === mobile,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const customerReservations = store.reservations
    .filter((r) => normalizeIranMobile(r.customer_phone) === mobile)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const customerLedger = store.loyalty_ledger
    .filter(
      (l) => l.customer_id === customer.id || normalizeIranMobile(l.customer_mobile) === mobile,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const customerRedemptions = store.reward_redemptions
    .filter(
      (r) => r.customer_id === customer.id || normalizeIranMobile(r.customer_mobile) === mobile,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const customerVouchers = store.vouchers.filter(
    (v) =>
      v.status === "active" &&
      (!v.customer_mobile || normalizeIranMobile(v.customer_mobile) === mobile),
  );

  return {
    session_token: sessionToken,
    customer,
    orders: customerOrders,
    reservations: customerReservations,
    tiers: store.loyalty_tiers,
    rewards: store.rewards.filter((r) => r.status === "active" && r.stock > 0),
    vouchers: customerVouchers,
    ledger: customerLedger,
    redemptions: customerRedemptions,
  };
}

export const requestCustomerOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; provider?: SmsProviderType }) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      mobile: string;
      provider: SmsProviderType;
      expires_in_sec: number;
      delivered_live: boolean;
      gateway_message: string;
      sandbox_code?: string;
      is_existing_customer: boolean;
      existing_customer_name?: string;
    }> => {
      const mobile = normalizeIranMobile(data.mobile);
      if (!/^09\d{9}$/.test(mobile)) {
        throw new Error("شماره موبایل معتبر نیست (مثال: 09121112233)");
      }
      const bundle = readBundle();
      const { config, store } = bundle;
      const provider: SmsProviderType =
        data.provider === "melipayamak" || data.provider === "mediana"
          ? data.provider
          : config.sms_provider || "mediana";

      const code = String(Math.floor(10000 + Math.random() * 90000));
      const nowMs = Date.now();
      const expiresAt = new Date(nowMs + 3 * 60 * 1000).toISOString();

      store.otp_challenges = (store.otp_challenges ?? []).filter(
        (c) => c.mobile !== mobile && new Date(c.expires_at).getTime() > nowMs,
      );

      const challenge: CustomerOtpChallenge = {
        id: `otp-${nowMs}`,
        mobile,
        code,
        provider,
        expires_at: expiresAt,
        verified: false,
        created_at: new Date(nowMs).toISOString(),
      };
      store.otp_challenges.unshift(challenge);
      writeBundle(bundle);

      const dispatchResult = await dispatchOtpSmsViaGateway({
        config,
        provider,
        mobile,
        code,
      });

      const existing = store.customers.find((c) => normalizeIranMobile(c.mobile) === mobile);

      return {
        mobile,
        provider,
        expires_in_sec: 180,
        delivered_live: dispatchResult.delivered_live,
        gateway_message: dispatchResult.gateway_message,
        sandbox_code: dispatchResult.delivered_live ? undefined : code,
        is_existing_customer: Boolean(existing),
        existing_customer_name: existing?.name,
      };
    },
  );

export const verifyCustomerOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; code: string; name?: string }) => input)
  .handler(async ({ data }): Promise<CustomerPortalData> => {
    const mobile = normalizeIranMobile(data.mobile);
    const code = toEnglishDigits(data.code ?? "").trim();
    if (!mobile || !code) {
      throw new Error("شماره موبایل و کد یکبارمصرف الزامی است");
    }

    const bundle = readBundle();
    const { store } = bundle;
    const nowMs = Date.now();

    const challenges = store.otp_challenges ?? [];
    const matched = challenges.find(
      (c) =>
        c.mobile === mobile &&
        c.code === code &&
        !c.verified &&
        new Date(c.expires_at).getTime() >= nowMs,
    );

    if (!matched) {
      throw new Error("کد یکبارمصرف نامعتبر یا منقضی شده است");
    }

    matched.verified = true;

    let customer = store.customers.find((c) => normalizeIranMobile(c.mobile) === mobile);
    if (!customer) {
      customer = {
        id: `cust-${nowMs}`,
        name: (data.name ?? "").trim() || "کاربر هالی کافه",
        mobile,
        loyalty_level: "bronze",
        loyalty_points: 20,
        total_spent: 0,
        orders_count: 0,
        notes: `احراز هویت پیامکی (${matched.provider === "mediana" ? "مدیانا" : "ملی پیامک"})`,
        created_at: new Date(nowMs).toISOString(),
      };
      store.customers.unshift(customer);
      store.loyalty_ledger.unshift({
        id: `led-${nowMs}`,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_mobile: customer.mobile,
        delta: 20,
        balance_after: 20,
        reason: "manual",
        note: "هدیه خوش‌آمدگویی ورود با شماره موبایل",
        created_at: new Date(nowMs).toISOString(),
      });
    } else if (data.name && data.name.trim()) {
      customer.name = data.name.trim();
    }

    const sessionToken = `csess_${Math.random().toString(36).slice(2, 12)}_${nowMs.toString(36)}`;
    const session: CustomerSession = {
      token: sessionToken,
      customer_id: customer.id,
      mobile: customer.mobile,
      created_at: new Date(nowMs).toISOString(),
      expires_at: new Date(nowMs + 30 * 86400000).toISOString(),
    };

    store.customer_sessions = [
      session,
      ...(store.customer_sessions ?? []).filter((s) => s.customer_id !== customer!.id),
    ];

    writeBundle(bundle);
    return buildCustomerPortalPayload(store, customer, sessionToken);
  });

export const getCustomerPortalBySession = createServerFn({ method: "POST" })
  .inputValidator((input: { session_token: string }) => input)
  .handler(async ({ data }): Promise<CustomerPortalData | null> => {
    const token = (data.session_token ?? "").trim();
    if (!token) return null;
    const bundle = readBundle();
    const { store } = bundle;
    const session = (store.customer_sessions ?? []).find(
      (s) => s.token === token && new Date(s.expires_at).getTime() > Date.now(),
    );
    if (!session) return null;
    const customer = store.customers.find(
      (c) =>
        c.id === session.customer_id ||
        normalizeIranMobile(c.mobile) === normalizeIranMobile(session.mobile),
    );
    if (!customer) return null;
    return buildCustomerPortalPayload(store, customer, session.token);
  });

export const updateCustomerPortalProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { session_token: string; name: string; notes?: string }) => input)
  .handler(async ({ data }): Promise<CustomerPortalData> => {
    const bundle = readBundle();
    const { store } = bundle;
    const session = (store.customer_sessions ?? []).find(
      (s) => s.token === data.session_token && new Date(s.expires_at).getTime() > Date.now(),
    );
    if (!session) throw new Error("نشست کاربری منقضی شده است، لطفاً مجدداً وارد شوید");
    const customer = store.customers.find((c) => c.id === session.customer_id);
    if (!customer) throw new Error("حساب کاربری یافت نشد");
    if (data.name.trim()) {
      customer.name = data.name.trim();
    }
    if (typeof data.notes === "string") {
      customer.notes = data.notes.trim();
    }
    writeBundle(bundle);
    return buildCustomerPortalPayload(store, customer, session.token);
  });

export const redeemCustomerPortalReward = createServerFn({ method: "POST" })
  .inputValidator((input: { session_token: string; reward_id: string }) => input)
  .handler(async ({ data }): Promise<CustomerPortalData> => {
    const bundle = readBundle();
    const { store } = bundle;
    const session = (store.customer_sessions ?? []).find(
      (s) => s.token === data.session_token && new Date(s.expires_at).getTime() > Date.now(),
    );
    if (!session) throw new Error("نشست کاربری منقضی شده است");
    const customer = store.customers.find((c) => c.id === session.customer_id);
    const reward = store.rewards.find((r) => r.id === data.reward_id && r.status === "active");
    if (!customer || !reward) throw new Error("جایزه یا مشتری یافت نشد");
    if (reward.stock <= 0) throw new Error("موجودی این جایزه تمام شده است");
    if (customer.loyalty_points < reward.points_cost) {
      throw new Error("امتیاز شما برای دریافت این جایزه کافی نیست");
    }

    customer.loyalty_points -= reward.points_cost;
    reward.stock -= 1;
    reward.redeemed_count += 1;
    const now = new Date().toISOString();
    const trackingCode = `RWD-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    store.reward_redemptions.unshift({
      id: `red-${Date.now()}`,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      reward_id: reward.id,
      reward_title: reward.title,
      points_spent: reward.points_cost,
      balance_after: customer.loyalty_points,
      tracking_code: trackingCode,
      created_at: now,
    });

    store.loyalty_ledger.unshift({
      id: `led-${Date.now()}`,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      delta: -reward.points_cost,
      balance_after: customer.loyalty_points,
      reason: "reward_redeem",
      note: `دریافت جایزه: ${reward.title} (${trackingCode})`,
      created_at: now,
    });

    if (reward.kind === "voucher" && reward.reward_value > 0) {
      store.vouchers.unshift({
        id: `vch-${Date.now()}`,
        code: trackingCode,
        title: `${reward.title} (${customer.name})`,
        kind: "fixed",
        value: reward.reward_value,
        min_order: 0,
        max_discount: reward.reward_value,
        customer_mobile: customer.mobile,
        usage_limit: 1,
        used_count: 0,
        expires_at: null,
        status: "active",
        created_at: now,
      });
    }

    writeBundle(bundle);
    return buildCustomerPortalPayload(store, customer, session.token);
  });

export type MutationActorInfo = {
  id?: string | null;
  name?: string;
  role?: string;
};

export type AdminMutationCoreAction =
  | { type: "save_config"; config: HallySystemConfig }
  | { type: "upsert_table"; table: Partial<DiningTable> & { name: string } }
  | { type: "toggle_table_status"; id: string }
  | { type: "delete_table"; id: string }
  | {
      type: "create_pos_order";
      order: CreatePublicOrderInput & {
        station?: "kitchen" | "bar" | "both";
        immediate_pay?: boolean;
        payment_method?: "cash" | "card" | "zarinpal" | "zibal";
        payment_reference?: string | null;
        created_by_id?: string | null;
        created_by_name?: string | null;
        created_by_role?: string | null;
      };
    }
  | {
      type: "update_pos_order";
      id: string;
      order: {
        order_type?: OrderType;
        table_code?: string | null;
        customer_name?: string;
        customer_phone?: string;
        discount_code?: string | null;
        notes?: string;
        station?: "kitchen" | "bar" | "both";
        items: Array<{
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          unit_cost?: number;
          quantity: number;
          option_label?: string;
        }>;
      };
    }
  | { type: "delete_pos_order"; id: string }
  | {
      type: "update_order_status";
      id: string;
      status: OrderStatus;
      payment_method?: "cash" | "card" | "zarinpal" | "zibal";
      payment_reference?: string | null;
      mark_synced?: boolean;
    }
  | {
      type: "upsert_reservation";
      reservation: Partial<TableReservation> & {
        customer_name: string;
        customer_phone: string;
        reservation_date: string;
        start_time: string;
      };
    }
  | {
      type: "update_reservation_status";
      id: string;
      status: TableReservation["status"];
    }
  | {
      type: "send_reservation_sms";
      id: string;
      custom_status?: "confirmed" | "cancelled";
    }
  | { type: "delete_reservation"; id: string }
  | {
      type: "upsert_customer";
      customer: Partial<CustomerProfile> & { name: string; mobile: string };
    }
  | {
      type: "adjust_customer_points";
      customer_id: string;
      delta: number;
      note: string;
    }
  | { type: "save_loyalty_tiers"; tiers: LoyaltyTier[] }
  | {
      type: "upsert_voucher";
      voucher: Partial<DiscountVoucher> & { code: string; title: string; value: number };
    }
  | { type: "toggle_voucher_status"; id: string }
  | { type: "delete_voucher"; id: string }
  | {
      type: "upsert_reward";
      reward: Partial<LoyaltyReward> & { code: string; title: string; points_cost: number };
    }
  | { type: "redeem_reward"; customer_id: string; reward_id: string }
  | { type: "delete_reward"; id: string }
  | {
      type: "upsert_printer";
      printer: Partial<PrinterDevice> & { name: string; station: PrinterDevice["station"] };
    }
  | { type: "delete_printer"; id: string }
  | { type: "claim_print_jobs"; limit?: number }
  | {
      type: "update_print_job_status";
      id: string;
      status: PrintJob["status"];
    }
  | { type: "reprint_order"; order_id: string }
  | {
      type: "update_payment_status";
      id: string;
      status: PaymentTransaction["status"];
    }
  | {
      type: "record_inventory_movement";
      movement: Omit<InventoryMovement, "id" | "created_at">;
    }
  | {
      type: "update_inventory_movement";
      id: string;
      movement: Partial<Pick<InventoryMovement, "quantity" | "reason" | "source" | "type">>;
    }
  | { type: "delete_inventory_movement"; id: string }
  | {
      type: "upsert_inventory_batch";
      batch: Partial<InventoryBatch> & {
        ingredient_id: string;
        ingredient_name: string;
        batch_number: string;
        quantity: number;
      };
    }
  | { type: "delete_inventory_batch"; id: string }
  | {
      type: "upsert_pricing_rule";
      rule: Partial<PricingRule> & { entity_name: string; margin_value: number };
    }
  | { type: "delete_pricing_rule"; id: string }
  | {
      type: "create_price_proposal";
      proposal: Omit<PriceApprovalEvent, "id" | "status" | "created_at" | "decided_at">;
    }
  | {
      type: "decide_price_proposal";
      id: string;
      decision: "approved" | "rejected";
    }
  | {
      type: "upsert_calendar_event";
      event: Partial<OperationalCalendarEvent> & { title: string; starts_at: string };
    }
  | { type: "delete_calendar_event"; id: string }
  | {
      type: "upsert_staff_user";
      user: Partial<StaffUser> & {
        name: string;
        username: string;
        role: StaffRole;
      };
    }
  | { type: "toggle_staff_user"; id: string }
  | { type: "delete_staff_user"; id: string }
  | {
      type: "record_audit_entry";
      entry: {
        action: string;
        entity: string;
        entity_id?: string | null;
        summary: string;
        details?: Record<string, unknown> | null;
      };
    };

export type AdminMutationAction = AdminMutationCoreAction & {
  actor?: MutationActorInfo;
};

function pushAudit(
  store: HallyStoreData,
  actor: MutationActorInfo | undefined,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
  details: Record<string, unknown> | null = null,
) {
  store.audit_entries = store.audit_entries ?? [];
  store.audit_entries.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: actor?.id ?? null,
    user_name: actor?.name || "مدیر سیستم",
    user_role: actor?.role || "مدیر کل (ادمین)",
    action,
    entity,
    entity_id: entityId,
    summary,
    details,
    created_at: new Date().toISOString(),
  });
  if (store.audit_entries.length > 500) {
    store.audit_entries = store.audit_entries.slice(0, 500);
  }
}

export const mutateHallyStore = createServerFn({ method: "POST" })
  .inputValidator((input: AdminMutationAction) => input)
  .handler(async ({ data: action }): Promise<PersistedBundle> => {
    const bundle = readBundle();
    const { store } = bundle;
    const now = new Date().toISOString();
    const actor = action.actor;

    switch (action.type) {
      case "save_config": {
        bundle.config = normalizeHallyConfig(action.config);
        pushAudit(
          store,
          actor,
          "save_config",
          "settings",
          "system_config",
          "بروزرسانی تنظیمات کلان سیستم و درگاه‌ها",
        );
        break;
      }

      case "upsert_table": {
        const input = action.table;
        if (input.id) {
          const existing = store.tables.find((t) => t.id === input.id);
          if (existing) {
            existing.name = input.name.trim();
            if (input.code?.trim()) existing.code = input.code.trim().toUpperCase();
            existing.capacity = Number(input.capacity) || existing.capacity;
            existing.sort_order = Number(input.sort_order) || existing.sort_order;
            existing.area = (input.area ?? existing.area).trim();
            if (input.status) existing.status = input.status;
            pushAudit(
              store,
              actor,
              "update_table",
              "table",
              existing.id,
              `ویرایش میز «${existing.name}» (${existing.code})`,
              {
                name: existing.name,
                code: existing.code,
                capacity: existing.capacity,
                area: existing.area,
              },
            );
          }
        } else {
          const hex = Math.random().toString(16).slice(2, 8).toUpperCase();
          const newId = `tbl-${Date.now()}`;
          const newTable: DiningTable = {
            id: newId,
            code: input.code?.trim().toUpperCase() || `T${hex}`,
            name: input.name.trim(),
            capacity: Number(input.capacity) || 4,
            status: "active",
            sort_order: Number(input.sort_order) || store.tables.length + 1,
            area: (input.area ?? "سالن اصلی").trim(),
            created_at: now,
          };
          store.tables.push(newTable);
          pushAudit(
            store,
            actor,
            "create_table",
            "table",
            newId,
            `تعریف میز جدید «${newTable.name}» (${newTable.code})`,
            {
              name: newTable.name,
              code: newTable.code,
              capacity: newTable.capacity,
            },
          );
        }
        break;
      }

      case "toggle_table_status": {
        const t = store.tables.find((x) => x.id === action.id);
        if (t) {
          t.status = t.status === "active" ? "archived" : "active";
          pushAudit(
            store,
            actor,
            "toggle_table",
            "table",
            t.id,
            `تغییر وضعیت میز «${t.name}» به ${t.status === "active" ? "فعال" : "آرشیو"}`,
          );
        }
        break;
      }

      case "delete_table": {
        const t = store.tables.find((x) => x.id === action.id);
        store.tables = store.tables.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_table",
          "table",
          action.id,
          `حذف میز «${t?.name ?? action.id}»`,
        );
        break;
      }

      case "create_pos_order": {
        const ordInput = action.order;
        const hasActiveTables =
          bundle.config.features.tables !== false &&
          store.tables.some((t) => t.status === "active");
        if (hasActiveTables && (!ordInput.table_code || ordInput.table_code === "none")) {
          throw new Error("انتخاب میز برای ثبت سفارش در صندوق (POS) اجباری است");
        }

        const isPaid = Boolean(ordInput.immediate_pay);
        const payMethod = ordInput.payment_method ?? (isPaid ? "card" : "unpaid");
        const cleanPaymentRef = toEnglishDigits(ordInput.payment_reference ?? "").trim();

        if (isPaid && payMethod === "card" && !cleanPaymentRef) {
          throw new Error("لطفاً شماره پرداخت فیش کارتخوان (POS) را وارد کنید");
        }

        const lines: OrderItemLine[] = ordInput.items
          .filter((it) => it.quantity > 0)
          .map((it) => ({
            menu_item_id: it.menu_item_id,
            item_name: it.item_name,
            unit_price: Number(it.unit_price) || 0,
            unit_cost: Number(it.unit_cost) || 0,
            quantity: Number(it.quantity) || 1,
            line_total: (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
            option_label: it.option_label,
          }));

        const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
        let discountAmount = 0;
        let appliedCode: string | null = null;
        const rawCode = (ordInput.discount_code ?? "").trim().toUpperCase();

        if (rawCode && bundle.config.features.vouchers !== false) {
          const voucher = store.vouchers.find(
            (v) => v.code.toUpperCase() === rawCode && v.status === "active",
          );
          if (voucher) {
            if (voucher.kind === "percent") {
              discountAmount = Math.round((subtotal * voucher.value) / 100);
              if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
                discountAmount = voucher.max_discount;
              }
            } else {
              discountAmount = Math.min(subtotal, voucher.value);
            }
            voucher.used_count += 1;
            appliedCode = voucher.code;
          }
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxAmount =
          bundle.config.tax_enabled && !bundle.config.tax_inclusive
            ? Math.round((afterDiscount * bundle.config.tax_rate) / 100)
            : 0;
        const total = afterDiscount + taxAmount;

        const matchedTable = ordInput.table_code
          ? store.tables.find((t) => t.code === ordInput.table_code)
          : null;

        const phone = (ordInput.customer_phone ?? "").trim();
        const name = (ordInput.customer_name ?? "").trim();
        let customer: CustomerProfile | undefined;

        if (phone && bundle.config.features.customers !== false) {
          customer = store.customers.find((c) => c.mobile === phone);
          if (!customer) {
            customer = {
              id: `cust-${Date.now()}`,
              name: name || "مشتری حضوری",
              mobile: phone,
              loyalty_level: "bronze",
              loyalty_points: 0,
              total_spent: 0,
              orders_count: 0,
              notes: "ثبت در صندوق (POS)",
              created_at: now,
            };
            store.customers.unshift(customer);
          }
        }

        const orderNumber = store.next_order_number++;

        const creatorName = ordInput.created_by_name || actor?.name || "مدیر سیستم";
        const creatorRole = ordInput.created_by_role || actor?.role || "مدیر کل (ادمین)";
        const creatorId = ordInput.created_by_id || actor?.id || null;

        const newOrder: CafeOrder = {
          id: `ord-${Date.now()}`,
          order_number: orderNumber,
          token: Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
          order_type: ordInput.order_type || "dine_in",
          table_code: matchedTable?.code ?? ordInput.table_code ?? null,
          table_name: matchedTable?.name ?? null,
          customer_id: customer?.id ?? null,
          customer_name: name || customer?.name || "مهمان",
          customer_phone: phone,
          status: isPaid ? "paid" : "pending",
          station: ordInput.station ?? "both",
          items: lines,
          subtotal,
          discount_code: appliedCode,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total,
          payment_method: payMethod,
          payment_reference: cleanPaymentRef || null,
          notes: (ordInput.notes ?? "").trim(),
          sales_synced: isPaid,
          stock_consumed: isPaid,
          created_by_id: creatorId,
          created_by_name: creatorName,
          created_by_role: creatorRole,
          created_at: now,
          updated_at: now,
        };

        store.orders.unshift(newOrder);
        if (bundle.config.features.printers !== false) {
          enqueueOrderPrintJobs(store, newOrder);
        }

        pushAudit(
          store,
          { id: creatorId, name: creatorName, role: creatorRole },
          "create_pos_order",
          "order",
          newOrder.id,
          `ثبت سفارش #${newOrder.order_number} (${newOrder.table_name || (newOrder.order_type === "takeaway" ? "بیرون‌بر" : "پیک")}) با ${lines.length} قلم به مبلغ ${total.toLocaleString("en-US")} ریال${cleanPaymentRef ? ` — شماره فیش پوز: ${cleanPaymentRef}` : ""}`,
          {
            order_number: newOrder.order_number,
            table_code: newOrder.table_code,
            table_name: newOrder.table_name,
            total: newOrder.total,
            payment_reference: cleanPaymentRef || null,
            items: lines.map((l) => `${l.item_name} × ${l.quantity}`),
          },
        );

        if (isPaid) {
          if (bundle.config.features.payments !== false) {
            store.payments.unshift({
              id: `pay-${Date.now()}`,
              order_id: newOrder.id,
              order_number: newOrder.order_number,
              customer_name: newOrder.customer_name,
              provider: payMethod === "unpaid" ? "card" : payMethod,
              amount: newOrder.total,
              status: "success",
              reference_id: cleanPaymentRef
                ? `POS-${cleanPaymentRef}`
                : `POS-${newOrder.order_number}`,
              created_at: now,
            });
          }

          if (customer) {
            customer.total_spent += newOrder.total;
            customer.orders_count += 1;
            if (bundle.config.features.loyalty !== false) {
              customer.loyalty_level = evaluateTier(customer.total_spent, store.loyalty_tiers);
              const earned = Math.max(
                1,
                Math.floor(
                  (newOrder.total / 100000) * (bundle.config.loyalty_points_per_1000 || 1),
                ),
              );
              customer.loyalty_points += earned;
              store.loyalty_ledger.unshift({
                id: `led-${Date.now()}`,
                customer_id: customer.id,
                customer_name: customer.name,
                customer_mobile: customer.mobile,
                delta: earned,
                balance_after: customer.loyalty_points,
                reason: "order_earn",
                note: `سفارش #${newOrder.order_number}`,
                created_at: now,
              });
            }
          }
        }
        break;
      }

      case "update_pos_order": {
        const existing = store.orders.find((o) => o.id === action.id);
        if (!existing) throw new Error("سفارش یافت نشد");
        const prevSnapshot = {
          table_name: existing.table_name,
          total: existing.total,
          items: existing.items.map((i) => `${i.item_name} × ${i.quantity}`),
          notes: existing.notes,
        };

        const ordInput = action.order;
        const lines: OrderItemLine[] = ordInput.items
          .filter((it) => it.quantity > 0)
          .map((it) => ({
            menu_item_id: it.menu_item_id,
            item_name: it.item_name,
            unit_price: Number(it.unit_price) || 0,
            unit_cost: Number(it.unit_cost) || 0,
            quantity: Number(it.quantity) || 1,
            line_total: (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
            option_label: it.option_label,
          }));

        if (lines.length === 0) {
          throw new Error("سفارش باید حداقل یک آیتم داشته باشد");
        }

        const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
        let discountAmount = 0;
        let appliedCode: string | null = null;
        const rawCode = (
          ordInput.discount_code !== undefined ? ordInput.discount_code : existing.discount_code
        )
          ?.trim()
          .toUpperCase();

        if (rawCode && bundle.config.features.vouchers !== false) {
          const voucher = store.vouchers.find((v) => v.code.toUpperCase() === rawCode);
          if (voucher) {
            if (voucher.kind === "percent") {
              discountAmount = Math.round((subtotal * voucher.value) / 100);
              if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
                discountAmount = voucher.max_discount;
              }
            } else {
              discountAmount = Math.min(subtotal, voucher.value);
            }
            appliedCode = voucher.code;
          }
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxAmount =
          bundle.config.tax_enabled && !bundle.config.tax_inclusive
            ? Math.round((afterDiscount * bundle.config.tax_rate) / 100)
            : 0;
        const total = afterDiscount + taxAmount;

        if (ordInput.order_type) {
          existing.order_type = ordInput.order_type;
        }
        if (ordInput.table_code !== undefined) {
          const matchedTable = ordInput.table_code
            ? store.tables.find((t) => t.code === ordInput.table_code)
            : null;
          existing.table_code = matchedTable?.code ?? ordInput.table_code ?? null;
          existing.table_name = matchedTable?.name ?? null;
        }
        if (ordInput.customer_name !== undefined) {
          existing.customer_name = ordInput.customer_name.trim() || "مهمان";
        }
        if (ordInput.customer_phone !== undefined) {
          existing.customer_phone = ordInput.customer_phone.trim();
        }
        if (ordInput.notes !== undefined) {
          existing.notes = ordInput.notes.trim();
        }
        if (ordInput.station) {
          existing.station = ordInput.station;
        }

        existing.items = lines;
        existing.subtotal = subtotal;
        existing.discount_code = appliedCode;
        existing.discount_amount = discountAmount;
        existing.tax_amount = taxAmount;
        existing.total = total;
        existing.updated_at = now;
        existing.updated_by_name = actor?.name || "مدیر سیستم";

        pushAudit(
          store,
          actor,
          "update_pos_order",
          "order",
          existing.id,
          `ویرایش سفارش #${existing.order_number} (${existing.table_name || "بیرون‌بر"}) — مبلغ جدید: ${total.toLocaleString("en-US")} ریال`,
          {
            order_number: existing.order_number,
            before: prevSnapshot,
            after: {
              table_name: existing.table_name,
              total: existing.total,
              items: lines.map((i) => `${i.item_name} × ${i.quantity}`),
              notes: existing.notes,
            },
          },
        );
        break;
      }

      case "delete_pos_order": {
        const ord = store.orders.find((o) => o.id === action.id);
        store.orders = store.orders.filter((o) => o.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_pos_order",
          "order",
          action.id,
          `حذف کامل سفارش #${ord?.order_number ?? action.id} (${ord?.table_name || "بیرون‌بر"})`,
          ord
            ? {
                order_number: ord.order_number,
                table_name: ord.table_name,
                total: ord.total,
                items: ord.items.map((i) => `${i.item_name} × ${i.quantity}`),
              }
            : null,
        );
        break;
      }

      case "update_order_status": {
        const order = store.orders.find((o) => o.id === action.id);
        if (order) {
          const prevStatus = order.status;
          const provider =
            action.payment_method ??
            (order.payment_method === "unpaid" ? "card" : order.payment_method);
          const cleanPaymentRef = toEnglishDigits(
            action.payment_reference ?? order.payment_reference ?? "",
          ).trim();

          if (
            action.status === "paid" &&
            prevStatus !== "paid" &&
            provider === "card" &&
            !cleanPaymentRef
          ) {
            throw new Error("لطفاً شماره پرداخت فیش کارتخوان (POS) را وارد کنید");
          }

          order.status = action.status;
          order.updated_at = now;
          order.updated_by_name = actor?.name || order.updated_by_name;
          if (action.payment_method) {
            order.payment_method = action.payment_method;
          }
          if (cleanPaymentRef) {
            order.payment_reference = cleanPaymentRef;
          }
          pushAudit(
            store,
            actor,
            "update_order_status",
            "order",
            order.id,
            `تغییر وضعیت سفارش #${order.order_number} از «${prevStatus}» به «${action.status}»${cleanPaymentRef ? ` (شماره فیش پوز: ${cleanPaymentRef})` : ""}`,
            {
              order_number: order.order_number,
              previous_status: prevStatus,
              new_status: action.status,
              payment_method: order.payment_method,
              payment_reference: order.payment_reference ?? null,
            },
          );
          if (action.status === "paid" && prevStatus !== "paid") {
            order.payment_method = provider;
            order.sales_synced = true;
            order.stock_consumed = true;
            if (bundle.config.features.payments !== false) {
              store.payments.unshift({
                id: `pay-${Date.now()}`,
                order_id: order.id,
                order_number: order.order_number,
                customer_name: order.customer_name,
                provider,
                amount: order.total,
                status: "success",
                reference_id: cleanPaymentRef
                  ? provider === "card"
                    ? `POS-${cleanPaymentRef}`
                    : cleanPaymentRef
                  : `ORD-${order.order_number}`,
                created_at: now,
              });
            }

            if (
              bundle.config.features.customers !== false &&
              (order.customer_phone || order.customer_id)
            ) {
              const customer = store.customers.find(
                (c) =>
                  c.id === order.customer_id ||
                  (order.customer_phone && c.mobile === order.customer_phone),
              );
              if (customer) {
                customer.total_spent += order.total;
                customer.orders_count += 1;
                if (bundle.config.features.loyalty !== false) {
                  customer.loyalty_level = evaluateTier(customer.total_spent, store.loyalty_tiers);
                  const earned = Math.max(
                    1,
                    Math.floor(
                      (order.total / 100000) * (bundle.config.loyalty_points_per_1000 || 1),
                    ),
                  );
                  customer.loyalty_points += earned;
                  store.loyalty_ledger.unshift({
                    id: `led-${Date.now()}`,
                    customer_id: customer.id,
                    customer_name: customer.name,
                    customer_mobile: customer.mobile,
                    delta: earned,
                    balance_after: customer.loyalty_points,
                    reason: "order_earn",
                    note: `تسویه سفارش #${order.order_number}`,
                    created_at: now,
                  });
                }
              }
            }
          }
        }
        break;
      }

      case "upsert_reservation": {
        const r = action.reservation;
        const matchedTable = r.table_id ? store.tables.find((t) => t.id === r.table_id) : null;
        if (r.id) {
          const existing = store.reservations.find((x) => x.id === r.id);
          if (existing) {
            existing.customer_name = r.customer_name.trim();
            existing.customer_phone = r.customer_phone.trim();
            existing.table_id = matchedTable?.id ?? r.table_id ?? null;
            existing.table_name = matchedTable?.name ?? r.table_name ?? existing.table_name;
            existing.reservation_date = r.reservation_date;
            existing.start_time = r.start_time;
            existing.duration_min = Number(r.duration_min) || 90;
            existing.guests = Number(r.guests) || 2;
            existing.notes = (r.notes ?? "").trim();
            if (r.status) existing.status = r.status;
            pushAudit(
              store,
              actor,
              "update_reservation",
              "reservation",
              existing.id,
              `ویرایش رزرو میز «${existing.customer_name}» (${existing.table_name})`,
            );
          }
        } else {
          const newRes: TableReservation = {
            id: `res-${Date.now()}`,
            customer_name: r.customer_name.trim(),
            customer_phone: r.customer_phone.trim(),
            table_id: matchedTable?.id ?? null,
            table_name: matchedTable?.name ?? "میز سالن",
            reservation_date: r.reservation_date,
            start_time: r.start_time,
            duration_min: Number(r.duration_min) || 90,
            guests: Number(r.guests) || 2,
            status: r.status ?? "reserved",
            notes: (r.notes ?? "").trim(),
            created_at: now,
          };
          store.reservations.unshift(newRes);
          pushAudit(
            store,
            actor,
            "create_reservation",
            "reservation",
            newRes.id,
            `ثبت رزرو جدید برای «${newRes.customer_name}» (${newRes.table_name})`,
          );
        }
        break;
      }

      case "update_reservation_status": {
        const res = store.reservations.find((x) => x.id === action.id);
        if (res) {
          res.status = action.status;
          if (action.status === "confirmed" || action.status === "cancelled") {
            const smsRes = await dispatchReservationSmsViaGateway({
              config: bundle.config,
              mobile: res.customer_phone,
              customerName: res.customer_name,
              reservationDate: res.reservation_date,
              startTime: res.start_time,
              tableName: res.table_name,
              status: action.status,
            });
            res.sms_sent_at = now;
            res.sms_last_status = action.status;
            res.sms_last_message = smsRes.message_text;
          }
          pushAudit(
            store,
            actor,
            "update_reservation_status",
            "reservation",
            res.id,
            `تغییر وضعیت رزرو «${res.customer_name}» به «${action.status}» و ارسال پیامک اطلاع‌رسانی`,
            { status: action.status, phone: res.customer_phone, sms_message: res.sms_last_message },
          );
        }
        break;
      }

      case "send_reservation_sms": {
        const res = store.reservations.find((x) => x.id === action.id);
        if (res) {
          const targetStatus =
            action.custom_status ?? (res.status === "cancelled" ? "cancelled" : "confirmed");
          const smsRes = await dispatchReservationSmsViaGateway({
            config: bundle.config,
            mobile: res.customer_phone,
            customerName: res.customer_name,
            reservationDate: res.reservation_date,
            startTime: res.start_time,
            tableName: res.table_name,
            status: targetStatus,
          });
          res.sms_sent_at = now;
          res.sms_last_status = targetStatus;
          res.sms_last_message = smsRes.message_text;
          pushAudit(
            store,
            actor,
            "send_reservation_sms",
            "reservation",
            res.id,
            `ارسال پیامک ${targetStatus === "confirmed" ? "تأیید" : "عدم تأیید"} رزرو به ${res.customer_phone}`,
          );
        }
        break;
      }

      case "delete_reservation": {
        const res = store.reservations.find((x) => x.id === action.id);
        store.reservations = store.reservations.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_reservation",
          "reservation",
          action.id,
          `حذف رزرو «${res?.customer_name ?? action.id}»`,
        );
        break;
      }

      case "upsert_customer": {
        const c = action.customer;
        if (c.id) {
          const existing = store.customers.find((x) => x.id === c.id);
          if (existing) {
            existing.name = c.name.trim();
            existing.mobile = c.mobile.trim();
            existing.notes = (c.notes ?? "").trim();
            if (c.loyalty_level) existing.loyalty_level = c.loyalty_level;
            pushAudit(
              store,
              actor,
              "update_customer",
              "customer",
              existing.id,
              `ویرایش پروفایل مشتری «${existing.name}»`,
            );
          }
        } else {
          const newCust: CustomerProfile = {
            id: `cust-${Date.now()}`,
            name: c.name.trim(),
            mobile: c.mobile.trim(),
            loyalty_level: c.loyalty_level ?? "bronze",
            loyalty_points: Number(c.loyalty_points) || 0,
            total_spent: Number(c.total_spent) || 0,
            orders_count: Number(c.orders_count) || 0,
            notes: (c.notes ?? "").trim(),
            created_at: now,
          };
          store.customers.unshift(newCust);
          pushAudit(
            store,
            actor,
            "create_customer",
            "customer",
            newCust.id,
            `افزودن مشتری جدید «${newCust.name}»`,
          );
        }
        break;
      }

      case "adjust_customer_points": {
        const cust = store.customers.find((x) => x.id === action.customer_id);
        if (cust) {
          const delta = Number(action.delta) || 0;
          cust.loyalty_points = Math.max(0, cust.loyalty_points + delta);
          store.loyalty_ledger.unshift({
            id: `led-${Date.now()}`,
            customer_id: cust.id,
            customer_name: cust.name,
            customer_mobile: cust.mobile,
            delta,
            balance_after: cust.loyalty_points,
            reason: delta >= 0 ? "manual" : "redeem",
            note: action.note.trim() || "تعدیل دستی امتیاز",
            created_at: now,
          });
          pushAudit(
            store,
            actor,
            "adjust_customer_points",
            "loyalty",
            cust.id,
            `تعدیل امتیاز «${cust.name}» به میزان ${delta}`,
          );
        }
        break;
      }

      case "save_loyalty_tiers": {
        store.loyalty_tiers = action.tiers;
        for (const c of store.customers) {
          c.loyalty_level = evaluateTier(c.total_spent, store.loyalty_tiers);
        }
        pushAudit(
          store,
          actor,
          "save_loyalty_tiers",
          "loyalty",
          null,
          "ویرایش سطوح وفاداری باشگاه مشتریان",
        );
        break;
      }

      case "upsert_voucher": {
        const v = action.voucher;
        if (v.id) {
          const existing = store.vouchers.find((x) => x.id === v.id);
          if (existing) {
            existing.code = v.code.trim().toUpperCase();
            existing.title = v.title.trim();
            existing.kind = v.kind ?? existing.kind;
            existing.value = Number(v.value) || 0;
            existing.min_order = Number(v.min_order) || 0;
            existing.max_discount = Number(v.max_discount) || 0;
            existing.usage_limit = Number(v.usage_limit) || 0;
            existing.expires_at = v.expires_at ?? null;
            existing.customer_mobile = v.customer_mobile?.trim() || null;
            if (v.status) existing.status = v.status;
            pushAudit(
              store,
              actor,
              "update_voucher",
              "voucher",
              existing.id,
              `ویرایش کد تخفیف «${existing.code}»`,
            );
          }
        } else {
          const newVch: DiscountVoucher = {
            id: `vch-${Date.now()}`,
            code: v.code.trim().toUpperCase(),
            title: v.title.trim(),
            kind: v.kind ?? "percent",
            value: Number(v.value) || 0,
            min_order: Number(v.min_order) || 0,
            max_discount: Number(v.max_discount) || 0,
            customer_mobile: v.customer_mobile?.trim() || null,
            usage_limit: Number(v.usage_limit) || 0,
            used_count: 0,
            expires_at: v.expires_at ?? null,
            status: "active",
            created_at: now,
          };
          store.vouchers.unshift(newVch);
          pushAudit(
            store,
            actor,
            "create_voucher",
            "voucher",
            newVch.id,
            `تعریف کد تخفیف «${newVch.code}»`,
          );
        }
        break;
      }

      case "toggle_voucher_status": {
        const v = store.vouchers.find((x) => x.id === action.id);
        if (v) {
          v.status = v.status === "active" ? "disabled" : "active";
          pushAudit(
            store,
            actor,
            "toggle_voucher",
            "voucher",
            v.id,
            `تغییر وضعیت کد تخفیف «${v.code}» به ${v.status}`,
          );
        }
        break;
      }

      case "delete_voucher": {
        const v = store.vouchers.find((x) => x.id === action.id);
        store.vouchers = store.vouchers.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_voucher",
          "voucher",
          action.id,
          `حذف کد تخفیف «${v?.code ?? action.id}»`,
        );
        break;
      }

      case "upsert_reward": {
        const rw = action.reward;
        if (rw.id) {
          const existing = store.rewards.find((x) => x.id === rw.id);
          if (existing) {
            existing.code = rw.code.trim().toUpperCase();
            existing.title = rw.title.trim();
            existing.kind = rw.kind ?? existing.kind;
            existing.points_cost = Number(rw.points_cost) || 0;
            existing.reward_value = Number(rw.reward_value) || 0;
            existing.stock = rw.stock !== undefined ? Number(rw.stock) : existing.stock;
            existing.description = (rw.description ?? "").trim();
            if (rw.status) existing.status = rw.status;
            pushAudit(
              store,
              actor,
              "update_reward",
              "reward",
              existing.id,
              `ویرایش پاداش «${existing.title}»`,
            );
          }
        } else {
          const newRw: LoyaltyReward = {
            id: `rew-${Date.now()}`,
            code: rw.code.trim().toUpperCase(),
            title: rw.title.trim(),
            kind: rw.kind ?? "manual",
            points_cost: Number(rw.points_cost) || 100,
            reward_value: Number(rw.reward_value) || 0,
            stock: Number(rw.stock) || 20,
            redeemed_count: 0,
            status: "active",
            description: (rw.description ?? "").trim(),
          };
          store.rewards.unshift(newRw);
          pushAudit(
            store,
            actor,
            "create_reward",
            "reward",
            newRw.id,
            `تعریف پاداش جدید «${newRw.title}»`,
          );
        }
        break;
      }

      case "redeem_reward": {
        const cust = store.customers.find((x) => x.id === action.customer_id);
        const rw = store.rewards.find((x) => x.id === action.reward_id);
        if (!cust || !rw) throw new Error("مشتری یا پاداش یافت نشد");
        if (rw.status !== "active" || rw.stock <= 0) {
          throw new Error("این پاداش در حال حاضر موجود نیست");
        }
        if (cust.loyalty_points < rw.points_cost) {
          throw new Error("امتیاز مشتری برای دریافت این پاداش کافی نیست");
        }
        cust.loyalty_points -= rw.points_cost;
        rw.stock -= 1;
        rw.redeemed_count += 1;
        const trackingCode = `RWD-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

        store.reward_redemptions.unshift({
          id: `red-${Date.now()}`,
          customer_id: cust.id,
          customer_name: cust.name,
          customer_mobile: cust.mobile,
          reward_id: rw.id,
          reward_title: rw.title,
          points_spent: rw.points_cost,
          balance_after: cust.loyalty_points,
          tracking_code: trackingCode,
          created_at: now,
        });

        store.loyalty_ledger.unshift({
          id: `led-${Date.now()}`,
          customer_id: cust.id,
          customer_name: cust.name,
          customer_mobile: cust.mobile,
          delta: -rw.points_cost,
          balance_after: cust.loyalty_points,
          reason: "reward_redeem",
          note: `استرداد پاداش «${rw.title}» (${trackingCode})`,
          created_at: now,
        });
        pushAudit(
          store,
          actor,
          "redeem_reward",
          "reward",
          rw.id,
          `استرداد پاداش «${rw.title}» برای مشتری «${cust.name}»`,
        );
        break;
      }

      case "delete_reward": {
        const rw = store.rewards.find((x) => x.id === action.id);
        store.rewards = store.rewards.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_reward",
          "reward",
          action.id,
          `حذف پاداش «${rw?.title ?? action.id}»`,
        );
        break;
      }

      case "upsert_printer": {
        const p = action.printer;
        if (p.id) {
          const existing = store.printers.find((x) => x.id === p.id);
          if (existing) {
            existing.name = p.name.trim();
            existing.station = p.station;
            existing.order_type = p.order_type ?? existing.order_type;
            existing.paper_width = p.paper_width ?? existing.paper_width;
            existing.copies = Number(p.copies) || 1;
            existing.mode = p.mode ?? existing.mode;
            if (p.status) existing.status = p.status;
            pushAudit(
              store,
              actor,
              "update_printer",
              "printer",
              existing.id,
              `ویرایش چاپگر «${existing.name}»`,
            );
          }
        } else {
          const newPrn: PrinterDevice = {
            id: `prn-${Date.now()}`,
            name: p.name.trim(),
            station: p.station,
            order_type: p.order_type ?? "all",
            paper_width: p.paper_width ?? 80,
            copies: Number(p.copies) || 1,
            mode: p.mode ?? "auto",
            status: "active",
          };
          store.printers.push(newPrn);
          pushAudit(
            store,
            actor,
            "create_printer",
            "printer",
            newPrn.id,
            `افزودن چاپگر جدید «${newPrn.name}»`,
          );
        }
        break;
      }

      case "delete_printer": {
        const p = store.printers.find((x) => x.id === action.id);
        store.printers = store.printers.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_printer",
          "printer",
          action.id,
          `حذف چاپگر «${p?.name ?? action.id}»`,
        );
        break;
      }

      case "claim_print_jobs": {
        const limit = action.limit ?? 20;
        let count = 0;
        for (const job of store.print_jobs) {
          if (job.status === "pending" && count < limit) {
            job.status = "claimed";
            count += 1;
          }
        }
        break;
      }

      case "update_print_job_status": {
        const job = store.print_jobs.find((x) => x.id === action.id);
        if (job) {
          job.status = action.status;
          if (action.status === "delivered") {
            job.delivered_at = now;
          }
        }
        break;
      }

      case "reprint_order": {
        const order = store.orders.find((o) => o.id === action.order_id);
        if (order && order.status !== "cancelled") {
          enqueueOrderPrintJobs(store, order);
          pushAudit(
            store,
            actor,
            "reprint_order",
            "order",
            order.id,
            `ارسال مجدد سفارش #${order.order_number} به صف چاپ`,
          );
        }
        break;
      }

      case "update_payment_status": {
        const pay = store.payments.find((x) => x.id === action.id);
        if (pay) {
          pay.status = action.status;
          pushAudit(
            store,
            actor,
            "update_payment_status",
            "payment",
            pay.id,
            `تغییر وضعیت تراکنش سفارش #${pay.order_number} به ${action.status}`,
          );
        }
        break;
      }

      case "record_inventory_movement": {
        const newMov: InventoryMovement = {
          ...action.movement,
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          created_at: now,
        };
        store.inventory_movements.unshift(newMov);
        pushAudit(
          store,
          actor,
          "record_inventory_movement",
          "inventory",
          newMov.id,
          `ثبت حرکت انبار برای «${newMov.ingredient_name}» (${newMov.quantity} ${newMov.unit})`,
        );
        break;
      }

      case "update_inventory_movement": {
        const mov = store.inventory_movements.find((x) => x.id === action.id);
        if (mov) {
          if (action.movement.quantity !== undefined)
            mov.quantity = Number(action.movement.quantity);
          if (action.movement.reason !== undefined) mov.reason = action.movement.reason.trim();
          if (action.movement.source !== undefined) mov.source = action.movement.source.trim();
          if (action.movement.type !== undefined) mov.type = action.movement.type;
          pushAudit(
            store,
            actor,
            "update_inventory_movement",
            "inventory",
            mov.id,
            `ویرایش حرکت انبار «${mov.ingredient_name}»`,
          );
        }
        break;
      }

      case "delete_inventory_movement": {
        const mov = store.inventory_movements.find((x) => x.id === action.id);
        store.inventory_movements = store.inventory_movements.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_inventory_movement",
          "inventory",
          action.id,
          `حذف حرکت انبار «${mov?.ingredient_name ?? action.id}»`,
        );
        break;
      }

      case "upsert_inventory_batch": {
        const b = action.batch;
        if (b.id) {
          const existing = store.inventory_batches.find((x) => x.id === b.id);
          if (existing) {
            existing.batch_number = b.batch_number.trim();
            existing.quantity = Number(b.quantity) || 0;
            if (b.received_at) existing.received_at = b.received_at;
            existing.expires_at = b.expires_at ?? existing.expires_at;
            if (b.cost_per_unit !== undefined)
              existing.cost_per_unit = Number(b.cost_per_unit) || 0;
            existing.status = b.status ?? existing.status;
            pushAudit(
              store,
              actor,
              "update_inventory_batch",
              "inventory_batch",
              existing.id,
              `ویرایش بچ انبار «${existing.batch_number}» (${existing.ingredient_name})`,
            );
          }
        } else {
          const newBatch: InventoryBatch = {
            id: `bat-${Date.now()}`,
            ingredient_id: b.ingredient_id,
            ingredient_name: b.ingredient_name,
            batch_number: b.batch_number.trim(),
            received_at: b.received_at ?? now.slice(0, 10),
            expires_at: b.expires_at ?? "",
            quantity: Number(b.quantity) || 0,
            unit: b.unit ?? "g",
            cost_per_unit: Number(b.cost_per_unit) || 0,
            status: b.status ?? "current",
          };
          store.inventory_batches.unshift(newBatch);
          pushAudit(
            store,
            actor,
            "create_inventory_batch",
            "inventory_batch",
            newBatch.id,
            `ثبت بچ جدید «${newBatch.batch_number}» برای «${newBatch.ingredient_name}»`,
          );
        }
        break;
      }

      case "delete_inventory_batch": {
        const b = store.inventory_batches.find((x) => x.id === action.id);
        store.inventory_batches = store.inventory_batches.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_inventory_batch",
          "inventory_batch",
          action.id,
          `حذف بچ انبار «${b?.batch_number ?? action.id}»`,
        );
        break;
      }

      case "upsert_pricing_rule": {
        const r = action.rule;
        if (r.id) {
          const existing = store.pricing_rules.find((x) => x.id === r.id);
          if (existing) {
            existing.scope = r.scope ?? existing.scope;
            existing.entity_id = r.entity_id ?? existing.entity_id;
            existing.entity_name = r.entity_name.trim();
            existing.margin_type = r.margin_type ?? existing.margin_type;
            existing.margin_value = Number(r.margin_value) || 0;
            existing.round_to = Number(r.round_to) || 1000;
            if (typeof r.is_active === "boolean") existing.is_active = r.is_active;
            pushAudit(
              store,
              actor,
              "update_pricing_rule",
              "pricing_rule",
              existing.id,
              `ویرایش قانون قیمت‌گذاری «${existing.entity_name}»`,
            );
          }
        } else {
          const newRule: PricingRule = {
            id: `pr-${Date.now()}`,
            scope: r.scope ?? "global",
            entity_id: r.entity_id ?? null,
            entity_name: r.entity_name.trim(),
            margin_type: r.margin_type ?? "percentage",
            margin_value: Number(r.margin_value) || 60,
            round_to: Number(r.round_to) || 10000,
            is_active: true,
            created_at: now,
          };
          store.pricing_rules.unshift(newRule);
          pushAudit(
            store,
            actor,
            "create_pricing_rule",
            "pricing_rule",
            newRule.id,
            `ثبت قانون قیمت‌گذاری «${newRule.entity_name}»`,
          );
        }
        break;
      }

      case "delete_pricing_rule": {
        const r = store.pricing_rules.find((x) => x.id === action.id);
        store.pricing_rules = store.pricing_rules.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_pricing_rule",
          "pricing_rule",
          action.id,
          `حذف قانون قیمت‌گذاری «${r?.entity_name ?? action.id}»`,
        );
        break;
      }

      case "create_price_proposal": {
        const prop: PriceApprovalEvent = {
          ...action.proposal,
          id: `pp-${Date.now()}`,
          status: "pending",
          created_at: now,
          decided_at: null,
        };
        store.price_proposals.unshift(prop);
        pushAudit(
          store,
          actor,
          "create_price_proposal",
          "price_proposal",
          prop.id,
          `ثبت پیشنهاد تغییر قیمت برای «${prop.menu_item_name}»`,
        );
        break;
      }

      case "decide_price_proposal": {
        const prop = store.price_proposals.find((x) => x.id === action.id);
        if (prop) {
          prop.status = action.decision;
          prop.decided_at = now;
          pushAudit(
            store,
            actor,
            "decide_price_proposal",
            "price_proposal",
            prop.id,
            `${action.decision === "approved" ? "تأیید" : "رد"} پیشنهاد قیمت «${prop.menu_item_name}»`,
          );
        }
        break;
      }

      case "upsert_calendar_event": {
        const ev = action.event;
        if (ev.id) {
          const existing = store.calendar_events.find((x) => x.id === ev.id);
          if (existing) {
            existing.title = ev.title.trim();
            existing.event_type = ev.event_type ?? existing.event_type;
            existing.starts_at = ev.starts_at;
            existing.ends_at = ev.ends_at ?? ev.starts_at;
            existing.status = ev.status ?? existing.status;
            existing.notes = (ev.notes ?? "").trim();
            pushAudit(
              store,
              actor,
              "update_calendar_event",
              "calendar",
              existing.id,
              `ویرایش رویداد تقویم «${existing.title}»`,
            );
          }
        } else {
          const newEv: OperationalCalendarEvent = {
            id: `cal-${Date.now()}`,
            title: ev.title.trim(),
            event_type: ev.event_type ?? "custom",
            starts_at: ev.starts_at,
            ends_at: ev.ends_at ?? ev.starts_at,
            status: ev.status ?? "scheduled",
            notes: (ev.notes ?? "").trim(),
          };
          store.calendar_events.unshift(newEv);
          pushAudit(
            store,
            actor,
            "create_calendar_event",
            "calendar",
            newEv.id,
            `ثبت رویداد تقویم «${newEv.title}»`,
          );
        }
        break;
      }

      case "delete_calendar_event": {
        const ev = store.calendar_events.find((x) => x.id === action.id);
        store.calendar_events = store.calendar_events.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_calendar_event",
          "calendar",
          action.id,
          `حذف رویداد تقویم «${ev?.title ?? action.id}»`,
        );
        break;
      }

      case "upsert_staff_user": {
        store.staff_users = store.staff_users ?? [];
        const u = action.user;
        const defaultPerms: StaffPermissions =
          DEFAULT_ROLE_PERMISSIONS[u.role] ?? DEFAULT_ROLE_PERMISSIONS.guest;
        if (u.id) {
          const existing = store.staff_users.find((x) => x.id === u.id);
          if (existing) {
            existing.name = u.name.trim();
            existing.username = toEnglishDigits(u.username).trim().toLowerCase();
            if (u.pin?.trim()) existing.pin = toEnglishDigits(u.pin).trim();
            if (u.phone !== undefined) existing.phone = toEnglishDigits(u.phone).trim();
            existing.role = u.role;
            existing.permissions = u.permissions
              ? { ...defaultPerms, ...u.permissions }
              : existing.permissions;
            if (typeof u.is_active === "boolean") existing.is_active = u.is_active;
            pushAudit(
              store,
              actor,
              "update_staff_user",
              "staff_user",
              existing.id,
              `ویرایش کاربر پرسنل «${existing.name}» با نقش ${STAFF_ROLE_LABELS[existing.role]}`,
            );
          }
        } else {
          const newStaff: StaffUser = {
            id: `stf-${Date.now()}`,
            name: u.name.trim(),
            username: toEnglishDigits(u.username).trim().toLowerCase(),
            pin: toEnglishDigits(u.pin || "1234").trim(),
            phone: toEnglishDigits(u.phone || "").trim(),
            role: u.role,
            permissions: u.permissions
              ? { ...defaultPerms, ...u.permissions }
              : { ...defaultPerms },
            is_active: u.is_active !== false,
            created_at: now,
          };
          store.staff_users.unshift(newStaff);
          pushAudit(
            store,
            actor,
            "create_staff_user",
            "staff_user",
            newStaff.id,
            `معرفی کاربر جدید «${newStaff.name}» با نقش ${STAFF_ROLE_LABELS[newStaff.role]}`,
          );
        }
        break;
      }

      case "toggle_staff_user": {
        store.staff_users = store.staff_users ?? [];
        const u = store.staff_users.find((x) => x.id === action.id);
        if (u) {
          u.is_active = !u.is_active;
          pushAudit(
            store,
            actor,
            "toggle_staff_user",
            "staff_user",
            u.id,
            `تغییر وضعیت کاربر «${u.name}» به ${u.is_active ? "فعال" : "غیرفعال"}`,
          );
        }
        break;
      }

      case "delete_staff_user": {
        store.staff_users = store.staff_users ?? [];
        const u = store.staff_users.find((x) => x.id === action.id);
        store.staff_users = store.staff_users.filter((x) => x.id !== action.id);
        pushAudit(
          store,
          actor,
          "delete_staff_user",
          "staff_user",
          action.id,
          `حذف کاربر پرسنل «${u?.name ?? action.id}»`,
        );
        break;
      }

      case "record_audit_entry": {
        pushAudit(
          store,
          actor,
          action.entry.action,
          action.entry.entity,
          action.entry.entity_id ?? null,
          action.entry.summary,
          action.entry.details ?? null,
        );
        break;
      }
    }

    writeBundle(bundle);
    return bundle;
  });
