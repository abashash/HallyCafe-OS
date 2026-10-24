export type DiningTable = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status: "active" | "archived";
  sort_order: number;
  area: string;
  created_at: string;
};

export type OrderItemLine = {
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  line_total: number;
  option_label?: string | undefined;
};

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "paid" | "cancelled";
export type OrderType = "dine_in" | "takeaway" | "delivery";

export type CafeOrder = {
  id: string;
  order_number: number;
  token: string;
  order_type: OrderType;
  table_code: string | null;
  table_name: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  station: "kitchen" | "bar" | "both";
  items: OrderItemLine[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_method: "cash" | "card" | "zarinpal" | "zibal" | "unpaid";
  payment_reference?: string | null;
  notes: string;
  sales_synced: boolean;
  stock_consumed: boolean;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  updated_by_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type TableReservation = {
  id: string;
  customer_name: string;
  customer_phone: string;
  table_id: string | null;
  table_name: string;
  reservation_date: string;
  start_time: string;
  duration_min: number;
  guests: number;
  status: "reserved" | "confirmed" | "completed" | "cancelled";
  notes: string;
  sms_sent_at?: string | null;
  sms_last_status?: "confirmed" | "cancelled" | "custom" | null;
  sms_last_message?: string | null;
  created_at: string;
};

export type CustomerProfile = {
  id: string;
  name: string;
  mobile: string;
  loyalty_level: "bronze" | "silver" | "gold" | "platinum";
  loyalty_points: number;
  total_spent: number;
  orders_count: number;
  notes: string;
  created_at: string;
};

export type LoyaltyTier = {
  key: "bronze" | "silver" | "gold" | "platinum";
  name: string;
  name_en: string;
  name_ar: string;
  min_spent: number;
  points_multiplier: number;
  discount_pct: number;
};

export type LoyaltyLedgerEntry = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  delta: number;
  balance_after: number;
  reason: "order_earn" | "manual" | "redeem" | "reward_redeem";
  note: string;
  created_at: string;
};

export type DiscountVoucher = {
  id: string;
  code: string;
  title: string;
  kind: "percent" | "fixed";
  value: number;
  min_order: number;
  max_discount: number;
  customer_mobile: string | null;
  usage_limit: number;
  used_count: number;
  expires_at: string | null;
  status: "active" | "disabled";
  created_at: string;
};

export type LoyaltyReward = {
  id: string;
  code: string;
  title: string;
  kind: "voucher" | "manual";
  points_cost: number;
  reward_value: number;
  stock: number;
  redeemed_count: number;
  status: "active" | "disabled";
  description: string;
};

export type RewardRedemption = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  reward_id: string;
  reward_title: string;
  points_spent: number;
  balance_after: number;
  tracking_code: string;
  created_at: string;
};

export type PrinterDevice = {
  id: string;
  name: string;
  station: "kitchen" | "bar" | "receipt";
  order_type: "all" | "dine_in" | "takeaway" | "delivery";
  paper_width: 80 | 58;
  copies: number;
  mode: "auto" | "manual";
  status: "active" | "archived";
};

export type PrintJob = {
  id: string;
  order_id: string;
  order_number: number;
  printer_id: string;
  printer_name: string;
  station: "kitchen" | "bar" | "receipt";
  ticket_type: "kitchen" | "bar" | "receipt";
  copies: number;
  status: "pending" | "claimed" | "delivered" | "failed" | "cancelled";
  payload: string;
  created_at: string;
  delivered_at: string | null;
};

export type PaymentProvider = "cash" | "card" | "zarinpal" | "zibal";

export type PaymentTransaction = {
  id: string;
  order_id: string;
  order_number: number;
  customer_name: string;
  provider: PaymentProvider;
  amount: number;
  status: "success" | "pending" | "failed" | "refunded";
  reference_id: string;
  created_at: string;
};

export type InventoryMovementType =
  "receipt" | "consumption" | "waste" | "adjustment" | "count" | "transfer";

export type InventoryMovement = {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  type: InventoryMovementType;
  quantity: number;
  unit: string;
  balance_after: number;
  source: string;
  reason: string;
  created_at: string;
};

export type InventoryBatch = {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  batch_number: string;
  received_at: string;
  expires_at: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  status: "current" | "expiring" | "expired";
};

export type PricingRule = {
  id: string;
  scope: "global" | "category" | "item";
  entity_id: string | null;
  entity_name: string;
  margin_type: "percentage" | "fixed";
  margin_value: number;
  round_to: number;
  is_active: boolean;
  created_at: string;
};

export type PriceApprovalEvent = {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  current_price: number;
  proposed_price: number;
  recipe_cost: number;
  food_cost_pct_before: number;
  food_cost_pct_after: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
};

export type OperationalCalendarEvent = {
  id: string;
  title: string;
  event_type:
    "custom" | "supplier_delivery" | "invoice_due" | "overhead_due" | "marketing" | "staff";
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "done" | "cancelled";
  notes: string;
};

export type CustomerOtpChallenge = {
  id: string;
  mobile: string;
  code: string;
  attempts?: number;
  provider: "mediana" | "melipayamak";
  expires_at: string;
  verified: boolean;
  created_at: string;
};

export type CustomerSession = {
  token: string;
  customer_id: string;
  mobile: string;
  created_at: string;
  expires_at: string;
};

export type StaffRole =
  "admin" | "manager" | "waiter" | "cashier" | "chef" | "inventory" | "accountant" | "guest";

export type StaffPermissions = {
  canCreateOrder: boolean;
  canEditOrder: boolean;
  canDeleteOrder: boolean;
  canSettleOrder: boolean;
  canManageMenu: boolean;
  canManageInventory: boolean;
  canManageReservations: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "مدیر کل (ادمین)",
  manager: "مدیر داخلی",
  waiter: "ویترس / سالن‌دار",
  cashier: "صندوقدار",
  chef: "آشپز / باریستا",
  inventory: "انباردار",
  accountant: "حسابدار",
  guest: "مهمان / ناظر",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  admin: {
    canCreateOrder: true,
    canEditOrder: true,
    canDeleteOrder: true,
    canSettleOrder: true,
    canManageMenu: true,
    canManageInventory: true,
    canManageReservations: true,
    canManageSettings: true,
    canViewAuditLogs: true,
  },
  manager: {
    canCreateOrder: true,
    canEditOrder: true,
    canDeleteOrder: true,
    canSettleOrder: true,
    canManageMenu: true,
    canManageInventory: true,
    canManageReservations: true,
    canManageSettings: false,
    canViewAuditLogs: true,
  },
  waiter: {
    canCreateOrder: true,
    canEditOrder: true,
    canDeleteOrder: false,
    canSettleOrder: false,
    canManageMenu: false,
    canManageInventory: false,
    canManageReservations: true,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  cashier: {
    canCreateOrder: true,
    canEditOrder: true,
    canDeleteOrder: true,
    canSettleOrder: true,
    canManageMenu: false,
    canManageInventory: false,
    canManageReservations: true,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  chef: {
    canCreateOrder: false,
    canEditOrder: false,
    canDeleteOrder: false,
    canSettleOrder: false,
    canManageMenu: true,
    canManageInventory: true,
    canManageReservations: false,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  inventory: {
    canCreateOrder: false,
    canEditOrder: false,
    canDeleteOrder: false,
    canSettleOrder: false,
    canManageMenu: false,
    canManageInventory: true,
    canManageReservations: false,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  accountant: {
    canCreateOrder: false,
    canEditOrder: false,
    canDeleteOrder: false,
    canSettleOrder: true,
    canManageMenu: false,
    canManageInventory: true,
    canManageReservations: false,
    canManageSettings: false,
    canViewAuditLogs: true,
  },
  guest: {
    canCreateOrder: false,
    canEditOrder: false,
    canDeleteOrder: false,
    canSettleOrder: false,
    canManageMenu: false,
    canManageInventory: false,
    canManageReservations: false,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
};

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  pin: string;
  phone: string;
  role: StaffRole;
  permissions: StaffPermissions;
  is_active: boolean;
  created_at: string;
};

export type StaffSessionUser = Omit<StaffUser, "pin">;

export type StaffLoginResult = {
  staff: StaffSessionUser;
  session_token: string;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type StaffAuditEntry = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  details: Record<string, JsonValue> | null;
  created_at: string;
};

export type HallyStoreData = {
  next_order_number: number;
  tables: DiningTable[];
  orders: CafeOrder[];
  reservations: TableReservation[];
  customers: CustomerProfile[];
  loyalty_tiers: LoyaltyTier[];
  loyalty_ledger: LoyaltyLedgerEntry[];
  vouchers: DiscountVoucher[];
  rewards: LoyaltyReward[];
  reward_redemptions: RewardRedemption[];
  printers: PrinterDevice[];
  print_jobs: PrintJob[];
  payments: PaymentTransaction[];
  inventory_movements: InventoryMovement[];
  inventory_batches: InventoryBatch[];
  pricing_rules: PricingRule[];
  price_proposals: PriceApprovalEvent[];
  calendar_events: OperationalCalendarEvent[];
  otp_challenges?: CustomerOtpChallenge[];
  customer_sessions?: CustomerSession[];
  staff_users?: StaffUser[];
  staff_login_attempts?: Record<string, { count: number; window_started_at: string }>;
  audit_entries?: StaffAuditEntry[];
};
