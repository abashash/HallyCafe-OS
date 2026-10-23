import type { AppLanguage, TrilingualText } from "@/lib/i18n";

export type FeatureKey =
  | "multilingual"
  | "online_menu"
  | "online_ordering"
  | "public_reservation"
  | "public_loyalty"
  | "pos"
  | "kds"
  | "orders"
  | "tables"
  | "reservations"
  | "printers"
  | "calendar"
  | "inventory"
  | "ingredients"
  | "menu"
  | "categories"
  | "pricing"
  | "suppliers"
  | "invoices"
  | "customers"
  | "loyalty"
  | "vouchers"
  | "rewards"
  | "payments"
  | "sales"
  | "expenses"
  | "reports"
  | "alerts"
  | "audit";

export type FeatureCategory =
  "public_site" | "operations" | "products_pricing" | "customers_loyalty" | "finance_system";

export type FeatureDefinition = {
  key: FeatureKey;
  category: FeatureCategory;
  title: TrilingualText;
  description: TrilingualText;
  defaultEnabled: boolean;
  route?: string;
};

export const FEATURE_CATEGORIES: Record<FeatureCategory, TrilingualText> = {
  public_site: {
    fa: "امکانات وب‌سایت عمومی و زبان‌ها",
    en: "Public Website & Languages",
    ar: "ميزات الموقع العام واللغات",
  },
  operations: {
    fa: "عملیات روزانه کافه (Hally OS)",
    en: "Daily Cafe Operations (Hally OS)",
    ar: "العمليات اليومية للمقهى",
  },
  products_pricing: {
    fa: "انبار، محصولات، رسپی و قیمت‌گذاری",
    en: "Inventory, Products, Recipes & Pricing",
    ar: "المخزون والمنتجات والوصفات والتسعير",
  },
  customers_loyalty: {
    fa: "باشگاه مشتریان، وفاداری و پاداش",
    en: "Customers, Loyalty & Rewards",
    ar: "نادي العملاء والولاء والمكافآت",
  },
  finance_system: {
    fa: "مالی، گزارش‌ها و سیستم",
    en: "Finance, Reports & System",
    ar: "المالية والتقارير والنظام",
  },
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "multilingual",
    category: "public_site",
    title: {
      fa: "سه‌زبانه بودن برنامه (فارسی، انگلیسی، عربی)",
      en: "Trilingual Mode (Persian, English, Arabic)",
      ar: "الوضع ثلاثي اللغات (الفارسية، الإنجليزية، العربية)",
    },
    description: {
      fa: "نمایش انتخابگر زبان در وب‌سایت عمومی و پنل مدیریت",
      en: "Show language switcher across public website and admin panel",
      ar: "إظهار محول اللغة في الموقع العام ولوحة الإدارة",
    },
    defaultEnabled: true,
  },
  {
    key: "online_menu",
    category: "public_site",
    title: {
      fa: "منوی آنلاین دیجیتال",
      en: "Digital Online Menu",
      ar: "القائمة الرقمية عبر الإنترنت",
    },
    description: {
      fa: "نمایش عمومی آیتم‌های منو، دسته‌بندی‌ها، تصاویر و جستجو",
      en: "Public display of menu items, categories, images, and search",
      ar: "العرض العام لعناصر القائمة والفئات والصور والبحث",
    },
    defaultEnabled: true,
    route: "/online-menu",
  },
  {
    key: "online_ordering",
    category: "public_site",
    title: {
      fa: "سفارش آنلاین، سبد خرید و پیگیری زنده سفارش",
      en: "Online Ordering, Cart & Live Order Tracking",
      ar: "الطلب عبر الإنترنت وسلة التسوق وتتبع الطلب المباشر",
    },
    description: {
      fa: "امکان ثبت سفارش از منوی آنلاین (سر میز با QR، بیرون‌بر، پیک) و پیگیری لحظه‌ای وضعیت",
      en: "Allow customers to place dine-in (QR), takeaway, or delivery orders and track status live",
      ar: "السماح للعملاء بتقديم طلبات داخل المقهى أو سفري أو توصيل وتتبع الحالة مباشرة",
    },
    defaultEnabled: true,
  },
  {
    key: "public_reservation",
    category: "public_site",
    title: {
      fa: "رزرو آنلاین میز توسط مشتریان",
      en: "Public Online Table Reservation",
      ar: "حجز الطاولات عبر الإنترنت للعملاء",
    },
    description: {
      fa: "فرم عمومی رزرو میز در وب‌سایت و منوی آنلاین",
      en: "Public table reservation form on the website and online menu",
      ar: "نموذج حجز الطاولات العام في الموقع والقائمة",
    },
    defaultEnabled: true,
  },
  {
    key: "public_loyalty",
    category: "public_site",
    title: {
      fa: "باشگاه مشتریان و استعلام امتیاز عمومی",
      en: "Public Loyalty Club & Points Lookup",
      ar: "نادي ولاء العملاء والاستعلام عن النقاط",
    },
    description: {
      fa: "امکان عضویت در باشگاه مشتریان، استعلام امتیاز و مشاهده جوایز در سایت عمومی",
      en: "Customer loyalty registration, points lookup, and rewards preview on public site",
      ar: "التسجيل في نادي الولاء والاستعلام عن النقاط ومعاينة المكافآت",
    },
    defaultEnabled: true,
  },
  {
    key: "pos",
    category: "operations",
    title: {
      fa: "صندوق / پایانه فروش (POS)",
      en: "Point of Sale Terminal (POS)",
      ar: "نقطة البيع والكاشير (POS)",
    },
    description: {
      fa: "ثبت سریع سفارش حضوری، انتخاب میز، اعمال کوپن تخفیف و تسویه حساب",
      en: "Fast counter ordering, table assignment, discount codes, and immediate checkout",
      ar: "تسجيل الطلبات السريع وتعيين الطاولة وتطبيق الكوبونات والدفع",
    },
    defaultEnabled: true,
    route: "/pos",
  },
  {
    key: "kds",
    category: "operations",
    title: {
      fa: "نمایشگر آشپزخانه و بار (KDS)",
      en: "Kitchen & Bar Display System (KDS)",
      ar: "شاشة عرض المطبخ والبار (KDS)",
    },
    description: {
      fa: "تخته کانبان لحظه‌ای سفارش‌های در انتظار، در حال آماده‌سازی، آماده و تحویل‌شده",
      en: "Live Kanban board for kitchen and bar stations (Pending, Preparing, Ready, Served)",
      ar: "لوحة كانبان المباشرة لمحطات المطبخ والبار",
    },
    defaultEnabled: true,
    route: "/kds",
  },
  {
    key: "orders",
    category: "operations",
    title: {
      fa: "صف سفارش‌ها و چرخه عمر سفارش",
      en: "Live Orders Queue & Lifecycle",
      ar: "طابور الطلبات المباشر وإدارة الحالة",
    },
    description: {
      fa: "مدیریت کامل سفارش‌ها با همگام‌سازی خودکار فروش ماهانه و کسر موجودی انبار",
      en: "Full order management with automatic monthly sales sync and recipe stock deduction",
      ar: "إدارة شاملة للطلبات مع مزامنة المبيعات وخصم المخزون تلقائياً",
    },
    defaultEnabled: true,
    route: "/orders",
  },
  {
    key: "tables",
    category: "operations",
    title: {
      fa: "میزهای سالن و کد QR",
      en: "Dining Tables & QR Codes",
      ar: "طاولات الصالة ورموز QR",
    },
    description: {
      fa: "تعریف میزها با کد اختصاصی و لینک مستقیم سفارش سر میز",
      en: "Manage dining tables with unique codes and direct QR ordering links",
      ar: "إدارة طاولات الصالة برموز فريدة وروابط طلب مباشر",
    },
    defaultEnabled: true,
    route: "/tables",
  },
  {
    key: "reservations",
    category: "operations",
    title: {
      fa: "مدیریت رزرو میزها",
      en: "Table Reservations Management",
      ar: "إدارة حجوزات الطاولات",
    },
    description: {
      fa: "مدیریت رزروهای ثبت‌شده، تخصیص میز و تغییر وضعیت رزرو",
      en: "Manage table bookings, assign tables, and track reservation statuses",
      ar: "إدارة حجوزات الطاولات وتعيين الطاولات وتتبع الحالة",
    },
    defaultEnabled: true,
    route: "/reservations",
  },
  {
    key: "printers",
    category: "operations",
    title: {
      fa: "چاپگرها و صف چاپ فیش",
      en: "Printers & Print Job Queue",
      ar: "الطابعات وطابور طباعة الإيصالات",
    },
    description: {
      fa: "مدیریت چاپگرهای آشپزخانه/بار/صندوق، صف فیش‌ها و پیش‌نمایش چاپ",
      en: "Manage kitchen/bar/receipt printers, print job queue, and receipt preview",
      ar: "إدارة طابعات المطبخ والبار والكاشير ومعاينة الإيصالات",
    },
    defaultEnabled: true,
    route: "/printers",
  },
  {
    key: "calendar",
    category: "operations",
    title: {
      fa: "تقویم عملیاتی شمسی",
      en: "Operational Jalali Calendar",
      ar: "التقويم التشغيلي",
    },
    description: {
      fa: "تقویم رویدادها، تحویل تأمین‌کنندگان، سررسید فاکتورها و شیفت پرسنل",
      en: "Schedule supplier deliveries, invoice due dates, marketing events, and staff shifts",
      ar: "جدولة تسليمات الموردين واستحقاق الفواتير ومناوبات الموظفين",
    },
    defaultEnabled: true,
    route: "/calendar",
  },
  {
    key: "inventory",
    category: "products_pricing",
    title: {
      fa: "دفتر کل انبار، حرکات و دسته‌ها (Inventory Ledger)",
      en: "Inventory Ledger, Movements & Batches",
      ar: "سجل المخزون والحركات والدفعات",
    },
    description: {
      fa: "ثبت رسید، مصرف، ضایعات، شمارش فیزیکی، انقضای دسته‌ها و مغایرت‌گیری موجودی",
      en: "Track stock levels, movement ledger, expiry batches, physical counts, and reconciliation",
      ar: "تتبع مستويات المخزون وسجل الحركات وتواريخ الانتهاء والجرد الفعلي",
    },
    defaultEnabled: true,
    route: "/inventory",
  },
  {
    key: "ingredients",
    category: "products_pricing",
    title: {
      fa: "مواد اولیه و واحدها",
      en: "Raw Materials & Units",
      ar: "المواد الأولية والوحدات",
    },
    description: {
      fa: "مدیریت مواد اولیه، ضریب تبدیل واحد خرید به پایه و تاریخچه قیمت",
      en: "Manage ingredients, purchase-to-base unit conversion factors, and price history",
      ar: "إدارة المواد الأولية ومعاملات تحويل الوحدات وسجل الأسعار",
    },
    defaultEnabled: true,
    route: "/ingredients",
  },
  {
    key: "menu",
    category: "products_pricing",
    title: {
      fa: "آیتم‌های منو و دستور پخت (رسپی)",
      en: "Menu Items & Recipes (BOM)",
      ar: "عناصر القائمة والوصفات",
    },
    description: {
      fa: "مدیریت آیتم‌های منو، مواد تشکیل‌دهنده هر رسپی و بهای تمام‌شده",
      en: "Manage menu items, recipe ingredient lines, and real-time cost calculation",
      ar: "إدارة عناصر القائمة ومكونات الوصفات وحساب التكلفة الفعلي",
    },
    defaultEnabled: true,
    route: "/menu",
  },
  {
    key: "categories",
    category: "products_pricing",
    title: {
      fa: "دسته‌بندی‌های منو",
      en: "Menu Categories",
      ar: "فئات القائمة",
    },
    description: {
      fa: "مدیریت دسته‌بندی‌های منو، ترتیب نمایش و وضعیت انتشار",
      en: "Organize menu categories, sort order, and publication status",
      ar: "تنظيم فئات القائمة وترتيب العرض وحالة النشر",
    },
    defaultEnabled: true,
    route: "/categories",
  },
  {
    key: "pricing",
    category: "products_pricing",
    title: {
      fa: "قوانین قیمت‌گذاری و تصویب تغییرات قیمت",
      en: "Pricing Rules & Manager Price Approval",
      ar: "قواعد التسعير واعتماد الأسعار",
    },
    description: {
      fa: "تعریف حاشیه سود هدف و گردش‌کار پیشنهاد و تصویب تغییر قیمت آیتم‌ها",
      en: "Target margin rules and manager approval workflow for menu price recommendations",
      ar: "قواعد هامش الربح المستهدف وسير عمل اعتماد تغييرات الأسعار",
    },
    defaultEnabled: true,
    route: "/pricing",
  },
  {
    key: "suppliers",
    category: "products_pricing",
    title: {
      fa: "تأمین‌کنندگان",
      en: "Suppliers Directory",
      ar: "دليل الموردين",
    },
    description: {
      fa: "مدیریت اطلاعات تماس و سوابق خرید از تأمین‌کنندگان",
      en: "Manage vendor contacts, notes, and supplier purchase records",
      ar: "إدارة بيانات الاتصال بالموردين وسجلات الشراء",
    },
    defaultEnabled: true,
    route: "/suppliers",
  },
  {
    key: "invoices",
    category: "products_pricing",
    title: {
      fa: "فاکتورهای خرید و استخراج هوشمند (OCR)",
      en: "Purchase Invoices & AI OCR",
      ar: "فواتير الشراء والمسح الذكي (OCR)",
    },
    description: {
      fa: "ثبت فاکتورهای خرید، اسکن هوشمند با هوش مصنوعی و به‌روزرسانی میانگین قیمت",
      en: "Record purchase invoices, AI OCR extraction, and automatic weighted cost updates",
      ar: "تسجيل فواتير الشراء والمسح الذكي بالذكاء الاصطناعي وتحديث التكلفة",
    },
    defaultEnabled: true,
    route: "/invoices",
  },
  {
    key: "customers",
    category: "customers_loyalty",
    title: {
      fa: "دفترچه مشتریان",
      en: "Customers Directory",
      ar: "دليل العملاء",
    },
    description: {
      fa: "مدیریت پروفایل مشتریان، سوابق خرید، سطح وفاداری و تعدیل امتیاز",
      en: "Manage customer profiles, order history, loyalty tier, and manual point adjustments",
      ar: "إدارة ملفات العملاء وسجل الطلبات ومستوى الولاء وتعديل النقاط",
    },
    defaultEnabled: true,
    route: "/customers",
  },
  {
    key: "loyalty",
    category: "customers_loyalty",
    title: {
      fa: "برنامه وفاداری و نردبان سطوح",
      en: "Loyalty Tiers & Points Engine",
      ar: "برنامج الولاء ومستويات العضوية",
    },
    description: {
      fa: "تنظیم سطوح برنزی/نقره‌ای/طلایی/پلاتینیوم، ضریب امتیاز و دفتر کل امتیازات",
      en: "Configure Bronze/Silver/Gold/Platinum tiers, earning rates, and points ledger",
      ar: "تكوين مستويات البرونز والفضة والذهب والبلاتين وسجل النقاط",
    },
    defaultEnabled: true,
    route: "/loyalty",
  },
  {
    key: "vouchers",
    category: "customers_loyalty",
    title: {
      fa: "کوپن‌های تخفیف",
      en: "Discount Vouchers & Coupons",
      ar: "قسائم وكوبونات الخصم",
    },
    description: {
      fa: "تعریف کدهای تخفیف درصدی یا مبلغ ثابت با سقف مصرف و تاریخ انقضا",
      en: "Create percentage or fixed-amount discount codes with usage limits and expiry",
      ar: "إنشاء أكواد خصم بنسبة مئوية أو مبلغ ثابت مع حد الاستخدام وتاريخ الانتهاء",
    },
    defaultEnabled: true,
    route: "/vouchers",
  },
  {
    key: "rewards",
    category: "customers_loyalty",
    title: {
      fa: "کاتالوگ پاداش‌ها و بازخرید امتیاز",
      en: "Rewards Catalog & Point Redemptions",
      ar: "كتالوج المكافآت واستبدال النقاط",
    },
    description: {
      fa: "تعریف جوایز باشگاه مشتریان و ثبت بازخرید امتیاز برای مشتریان",
      en: "Manage redeemable loyalty rewards and record customer point redemptions",
      ar: "إدارة مكافآت الولاء القابلة للاستبدال وتسجيل عمليات الاستبدال للعملاء",
    },
    defaultEnabled: true,
    route: "/rewards",
  },
  {
    key: "payments",
    category: "finance_system",
    title: {
      fa: "مدیریت پرداخت‌ها و تراکنش‌ها",
      en: "Payments & Settlement Ledger",
      ar: "إدارة المدفوعات والمعاملات",
    },
    description: {
      fa: "رهگیری پرداخت‌های نقدی، کارتخوان و درگاه آنلاین (زرین‌پال/زیبال) و استرداد",
      en: "Track cash, POS card, and online gateway (Zarinpal/Zibal) transactions and refunds",
      ar: "تتبع المدفوعات النقدية وأجهزة البطاقات وبوابات الدفع الإلكتروني",
    },
    defaultEnabled: true,
    route: "/payments",
  },
  {
    key: "sales",
    category: "finance_system",
    title: {
      fa: "فروش ماهانه",
      en: "Monthly Sales Tracking",
      ar: "المبيعات الشهرية",
    },
    description: {
      fa: "ثبت و بررسی حجم فروش ماهانه به تفکیک آیتم‌های منو",
      en: "Record and analyze monthly sales volume per menu item",
      ar: "تسجيل وتحليل حجم المبيعات الشهرية لكل عنصر في القائمة",
    },
    defaultEnabled: true,
    route: "/sales",
  },
  {
    key: "expenses",
    category: "finance_system",
    title: {
      fa: "هزینه‌های سربار و ثابت",
      en: "Overhead & Fixed Expenses",
      ar: "المصاريف الثابتة والتشغيلية",
    },
    description: {
      fa: "ثبت اجاره، حقوق، قبوض و سایر هزینه‌های عملیاتی ماهانه",
      en: "Track rent, payroll, utilities, and recurring monthly operating expenses",
      ar: "تتبع الإيجار والرواتب والفواتير والمصاريف التشغيلية الشهرية",
    },
    defaultEnabled: true,
    route: "/expenses",
  },
  {
    key: "reports",
    category: "finance_system",
    title: {
      fa: "گزارش بهای تمام‌شده و سود و زیان",
      en: "Cost & P&L Financial Reports",
      ar: "تقارير التكلفة والأرباح والخسائر",
    },
    description: {
      fa: "تحلیل سود ناخالص، سود خالص، بهای تمام‌شده و رتبه‌بندی حاشیه سود آیتم‌ها",
      en: "Analyze gross profit, net profit, COGS breakdown, and item margin rankings",
      ar: "تحليل إجمالي الربح وصافي الربح وتفاصيل التكلفة وترتيب هامش الربح",
    },
    defaultEnabled: true,
    route: "/reports",
  },
  {
    key: "alerts",
    category: "finance_system",
    title: {
      fa: "اعلان‌ها و هشدارهای هوشمند",
      en: "Smart Alerts & Notifications",
      ar: "التنبيهات والإشعارات الذكية",
    },
    description: {
      fa: "هشدار تغییرات قیمت مواد اولیه، کسری انبار و سررسید فاکتورها",
      en: "Alerts for ingredient price spikes, low inventory stock, and overdue invoices",
      ar: "تنبيهات ارتفاع أسعار المواد الأولية ونقص المخزون واستحقاق الفواتير",
    },
    defaultEnabled: true,
    route: "/alerts",
  },
  {
    key: "audit",
    category: "finance_system",
    title: {
      fa: "گزارش فعالیت و رویدادها (Audit Log)",
      en: "System Audit Log",
      ar: "سجل تدقيق النظام والأنشطة",
    },
    description: {
      fa: "ثبت کامل سوابق تغییرات قیمت، فاکتورها، سفارش‌ها و تنظیمات سیستم",
      en: "Immutable audit trail of price changes, invoices, orders, and setting updates",
      ar: "سجل تدقيق شامل لتغييرات الأسعار والفواتير والطلبات والإعدادات",
    },
    defaultEnabled: true,
    route: "/audit",
  },
];

export type FeatureFlagsMap = Record<FeatureKey, boolean>;

export type SmsProviderType = "mediana" | "melipayamak";

export type HallySystemConfig = {
  features: FeatureFlagsMap;
  default_language: AppLanguage;
  enabled_languages: AppLanguage[];
  currency_symbol: string;
  tax_enabled: boolean;
  tax_rate: number;
  tax_inclusive: boolean;
  loyalty_points_per_1000: number;
  loyalty_cashback_pct: number;
  round_prices_to: number;
  max_food_cost_pct: number;
  default_margin_type: "percentage" | "fixed";
  default_margin_value: number;
  price_change_threshold_pct: number;
  online_menu_show_ingredients: boolean;
  online_menu_show_allergens: boolean;
  zarinpal_merchant_id: string;
  zibal_merchant_id: string;
  sms_provider: SmsProviderType;
  sms_sandbox_mode: boolean;
  mediana_api_key: string;
  mediana_pattern_code: string;
  mediana_pattern_reservation: string;
  mediana_pattern_order: string;
  mediana_sender_number: string;
  melipayamak_username: string;
  melipayamak_password: string;
  melipayamak_body_id: string;
  melipayamak_body_id_reservation: string;
  melipayamak_body_id_order: string;
  melipayamak_sender_number: string;
};

export function getDefaultFeatureFlags(): FeatureFlagsMap {
  const map = {} as FeatureFlagsMap;
  for (const def of FEATURE_DEFINITIONS) {
    map[def.key] = def.defaultEnabled;
  }
  return map;
}

export const DEFAULT_HALLY_CONFIG: HallySystemConfig = {
  features: getDefaultFeatureFlags(),
  default_language: "fa",
  enabled_languages: ["fa", "en", "ar"],
  currency_symbol: "ریال",
  tax_enabled: false,
  tax_rate: 9,
  tax_inclusive: true,
  loyalty_points_per_1000: 1,
  loyalty_cashback_pct: 5,
  round_prices_to: 1000,
  max_food_cost_pct: 35,
  default_margin_type: "percentage",
  default_margin_value: 60,
  price_change_threshold_pct: 5,
  online_menu_show_ingredients: true,
  online_menu_show_allergens: true,
  zarinpal_merchant_id: "",
  zibal_merchant_id: "",
  sms_provider: "mediana",
  sms_sandbox_mode: true,
  mediana_api_key: "",
  mediana_pattern_code: "hally-otp-verify",
  mediana_pattern_reservation: "hally-res-confirm",
  mediana_pattern_order: "hally-order-alert",
  mediana_sender_number: "3000505",
  melipayamak_username: "",
  melipayamak_password: "",
  melipayamak_body_id: "148290",
  melipayamak_body_id_reservation: "148291",
  melipayamak_body_id_order: "148292",
  melipayamak_sender_number: "50004001",
};

export const HALLY_CONFIG_LINK_MARKER = "__hally_system_config_v1__";

export function normalizeHallyConfig(raw: unknown): HallySystemConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_HALLY_CONFIG, features: getDefaultFeatureFlags() };
  }
  const obj = raw as Partial<HallySystemConfig>;
  const defaultFeatures = getDefaultFeatureFlags();
  const mergedFeatures: FeatureFlagsMap = { ...defaultFeatures };

  if (obj.features && typeof obj.features === "object") {
    for (const def of FEATURE_DEFINITIONS) {
      const val = (obj.features as Record<string, unknown>)[def.key];
      if (typeof val === "boolean") {
        mergedFeatures[def.key] = val;
      }
    }
  }

  const enabledLangs = Array.isArray(obj.enabled_languages)
    ? obj.enabled_languages.filter((l): l is AppLanguage => l === "fa" || l === "en" || l === "ar")
    : DEFAULT_HALLY_CONFIG.enabled_languages;

  return {
    features: mergedFeatures,
    default_language:
      obj.default_language === "fa" ||
      obj.default_language === "en" ||
      obj.default_language === "ar"
        ? obj.default_language
        : DEFAULT_HALLY_CONFIG.default_language,
    enabled_languages: enabledLangs.length > 0 ? enabledLangs : ["fa"],
    currency_symbol:
      typeof obj.currency_symbol === "string" && obj.currency_symbol.trim()
        ? obj.currency_symbol.trim()
        : DEFAULT_HALLY_CONFIG.currency_symbol,
    tax_enabled:
      typeof obj.tax_enabled === "boolean" ? obj.tax_enabled : DEFAULT_HALLY_CONFIG.tax_enabled,
    tax_rate:
      typeof obj.tax_rate === "number" && Number.isFinite(obj.tax_rate)
        ? obj.tax_rate
        : DEFAULT_HALLY_CONFIG.tax_rate,
    tax_inclusive:
      typeof obj.tax_inclusive === "boolean"
        ? obj.tax_inclusive
        : DEFAULT_HALLY_CONFIG.tax_inclusive,
    loyalty_points_per_1000:
      typeof obj.loyalty_points_per_1000 === "number" &&
      Number.isFinite(obj.loyalty_points_per_1000)
        ? obj.loyalty_points_per_1000
        : DEFAULT_HALLY_CONFIG.loyalty_points_per_1000,
    loyalty_cashback_pct:
      typeof obj.loyalty_cashback_pct === "number" && Number.isFinite(obj.loyalty_cashback_pct)
        ? obj.loyalty_cashback_pct
        : DEFAULT_HALLY_CONFIG.loyalty_cashback_pct,
    round_prices_to:
      typeof obj.round_prices_to === "number" && Number.isFinite(obj.round_prices_to)
        ? obj.round_prices_to
        : DEFAULT_HALLY_CONFIG.round_prices_to,
    max_food_cost_pct:
      typeof obj.max_food_cost_pct === "number" && Number.isFinite(obj.max_food_cost_pct)
        ? obj.max_food_cost_pct
        : DEFAULT_HALLY_CONFIG.max_food_cost_pct,
    default_margin_type:
      obj.default_margin_type === "fixed" ? "fixed" : DEFAULT_HALLY_CONFIG.default_margin_type,
    default_margin_value:
      typeof obj.default_margin_value === "number" && Number.isFinite(obj.default_margin_value)
        ? obj.default_margin_value
        : DEFAULT_HALLY_CONFIG.default_margin_value,
    price_change_threshold_pct:
      typeof obj.price_change_threshold_pct === "number" &&
      Number.isFinite(obj.price_change_threshold_pct)
        ? obj.price_change_threshold_pct
        : DEFAULT_HALLY_CONFIG.price_change_threshold_pct,
    online_menu_show_ingredients:
      typeof obj.online_menu_show_ingredients === "boolean"
        ? obj.online_menu_show_ingredients
        : DEFAULT_HALLY_CONFIG.online_menu_show_ingredients,
    online_menu_show_allergens:
      typeof obj.online_menu_show_allergens === "boolean"
        ? obj.online_menu_show_allergens
        : DEFAULT_HALLY_CONFIG.online_menu_show_allergens,
    zarinpal_merchant_id:
      typeof obj.zarinpal_merchant_id === "string" ? obj.zarinpal_merchant_id : "",
    zibal_merchant_id: typeof obj.zibal_merchant_id === "string" ? obj.zibal_merchant_id : "",
    sms_provider:
      obj.sms_provider === "melipayamak" ? "melipayamak" : DEFAULT_HALLY_CONFIG.sms_provider,
    sms_sandbox_mode:
      typeof obj.sms_sandbox_mode === "boolean"
        ? obj.sms_sandbox_mode
        : DEFAULT_HALLY_CONFIG.sms_sandbox_mode,
    mediana_api_key:
      typeof obj.mediana_api_key === "string"
        ? obj.mediana_api_key
        : DEFAULT_HALLY_CONFIG.mediana_api_key,
    mediana_pattern_code:
      typeof obj.mediana_pattern_code === "string"
        ? obj.mediana_pattern_code
        : DEFAULT_HALLY_CONFIG.mediana_pattern_code,
    mediana_pattern_reservation:
      typeof obj.mediana_pattern_reservation === "string"
        ? obj.mediana_pattern_reservation
        : DEFAULT_HALLY_CONFIG.mediana_pattern_reservation,
    mediana_pattern_order:
      typeof obj.mediana_pattern_order === "string"
        ? obj.mediana_pattern_order
        : DEFAULT_HALLY_CONFIG.mediana_pattern_order,
    mediana_sender_number:
      typeof obj.mediana_sender_number === "string"
        ? obj.mediana_sender_number
        : DEFAULT_HALLY_CONFIG.mediana_sender_number,
    melipayamak_username:
      typeof obj.melipayamak_username === "string"
        ? obj.melipayamak_username
        : DEFAULT_HALLY_CONFIG.melipayamak_username,
    melipayamak_password:
      typeof obj.melipayamak_password === "string"
        ? obj.melipayamak_password
        : DEFAULT_HALLY_CONFIG.melipayamak_password,
    melipayamak_body_id:
      typeof obj.melipayamak_body_id === "string"
        ? obj.melipayamak_body_id
        : DEFAULT_HALLY_CONFIG.melipayamak_body_id,
    melipayamak_body_id_reservation:
      typeof obj.melipayamak_body_id_reservation === "string"
        ? obj.melipayamak_body_id_reservation
        : DEFAULT_HALLY_CONFIG.melipayamak_body_id_reservation,
    melipayamak_body_id_order:
      typeof obj.melipayamak_body_id_order === "string"
        ? obj.melipayamak_body_id_order
        : DEFAULT_HALLY_CONFIG.melipayamak_body_id_order,
    melipayamak_sender_number:
      typeof obj.melipayamak_sender_number === "string"
        ? obj.melipayamak_sender_number
        : DEFAULT_HALLY_CONFIG.melipayamak_sender_number,
  };
}
