import { useEffect, useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SmsProviderType } from "@/lib/feature-flags";
import { useFeatureFlags } from "@/lib/hally-os";
import {
  getCustomerPortalBySession,
  redeemCustomerPortalReward,
  requestCustomerOtp,
  updateCustomerPortalProfile,
  verifyCustomerOtp,
  type CustomerPortalData,
} from "@/lib/hally-os.functions";
import type { CafeOrder } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";
import { localizeDigits, toEnglishDigits } from "@/lib/jalali";

const CUSTOMER_SESSION_STORAGE_KEY = "hally_customer_session_v1";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvider?: SmsProviderType;
  currencySymbol?: string;
  onCustomerAuthenticated?: (portal: CustomerPortalData | null) => void;
  onApplyVoucherCode?: (code: string) => void;
};

export function getSavedCustomerSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function CustomerAccountDialog({
  open,
  onOpenChange,
  defaultProvider = "mediana",
  currencySymbol,
  onCustomerAuthenticated,
  onApplyVoucherCode,
}: Props) {
  const { lang, dir, t, formatMoney, formatNumber, formatDate, formatDateTime } = useI18n();
  const { isEnabled } = useFeatureFlags();

  const [step, setStep] = useState<"phone" | "otp" | "account">("phone");
  const [provider, setProvider] = useState<SmsProviderType>(defaultProvider);
  const [mobile, setMobile] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState("");
  const [isExisting, setIsExisting] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const [portal, setPortal] = useState<CustomerPortalData | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CafeOrder | null>(null);

  useEffect(() => {
    setProvider(defaultProvider);
  }, [defaultProvider]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const loadExistingSession = async () => {
    const token = getSavedCustomerSessionToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await getCustomerPortalBySession({ data: { session_token: token } });
      if (data) {
        setPortal(data);
        setEditName(data.customer.name);
        setEditNotes(data.customer.notes || "");
        setStep("account");
        onCustomerAuthenticated?.(data);
      } else {
        window.localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore invalid session
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadExistingSession();
    }
  }, [open]);

  const handleRequestOtp = async (overrideMobile?: string) => {
    const rawMobile = toEnglishDigits(overrideMobile ?? mobile).trim();
    if (!rawMobile) {
      toast.error(
        t("شماره موبایل خود را وارد کنید", "Please enter your mobile number", "أدخل رقم الجوال"),
      );
      return;
    }
    setLoading(true);
    try {
      const res = await requestCustomerOtp({
        data: {
          mobile: rawMobile,
          provider,
        },
      });
      setMobile(res.mobile);
      setIsExisting(res.is_existing_customer);
      if (res.existing_customer_name) {
        setCustomerName(res.existing_customer_name);
      }
      setGatewayMsg(res.gateway_message);
      setSandboxCode(res.sandbox_code ?? null);
      if (res.sandbox_code) {
        setOtpCode(res.sandbox_code);
      } else {
        setOtpCode("");
      }
      setCountdown(res.expires_in_sec || 180);
      setStep("otp");
      toast.success(
        provider === "mediana"
          ? t(
              "کد یکبارمصرف از طریق مدیانا ارسال شد",
              "OTP code sent via Mediana SMS",
              "تم إرسال رمز التحقق عبر مديانا",
            )
          : t(
              "کد یکبارمصرف از طریق ملی پیامک ارسال شد",
              "OTP code sent via MeliPayamak SMS",
              "تم إرسال رمز التحقق عبر ملي پیامک",
            ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ارسال پیامک");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanCode = toEnglishDigits(otpCode).trim();
    if (!cleanCode) {
      toast.error(t("کد یکبارمصرف را وارد کنید", "Please enter the OTP code", "أدخل رمز التحقق"));
      return;
    }
    setLoading(true);
    try {
      const res = await verifyCustomerOtp({
        data: {
          mobile,
          code: cleanCode,
          name: customerName.trim() || undefined,
        },
      });
      try {
        window.localStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, res.session_token);
      } catch {
        // ignore storage error
      }
      setPortal(res);
      setEditName(res.customer.name);
      setEditNotes(res.customer.notes || "");
      setStep("account");
      onCustomerAuthenticated?.(res);
      toast.success(
        t(
          `${res.customer.name} عزیز، خوش آمدید!`,
          `Welcome, ${res.customer.name}!`,
          `مرحباً بك يا ${res.customer.name}!`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "کد وارد شده صحیح نیست");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      window.localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setPortal(null);
    setOtpCode("");
    setSandboxCode(null);
    setStep("phone");
    onCustomerAuthenticated?.(null);
    toast.success(
      t("از حساب کاربری خارج شدید", "Logged out of customer account", "تم تسجيل الخروج"),
    );
  };

  const handleSaveProfile = async () => {
    if (!portal) return;
    setSavingProfile(true);
    try {
      const updated = await updateCustomerPortalProfile({
        data: {
          session_token: portal.session_token,
          name: editName,
          notes: editNotes,
        },
      });
      setPortal(updated);
      onCustomerAuthenticated?.(updated);
      toast.success(t("اطلاعات حساب کاربری بروزرسانی شد", "Profile updated", "تم تحديث الحساب"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره پروفایل");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!portal) return;
    setLoading(true);
    try {
      const updated = await redeemCustomerPortalReward({
        data: {
          session_token: portal.session_token,
          reward_id: rewardId,
        },
      });
      setPortal(updated);
      onCustomerAuthenticated?.(updated);
      toast.success(
        t(
          "جایزه با موفقیت دریافت شد و کد رهگیری صادر گردید!",
          "Reward redeemed successfully!",
          "تم استبدال المكافأة بنجاح!",
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در دریافت جایزه");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (s: CafeOrder["status"]) => {
    switch (s) {
      case "pending":
        return t("ثبت‌شده / در انتظار", "Pending", "قيد الانتظار");
      case "preparing":
        return t("در حال آماده‌سازی", "Preparing", "قيد التحضير");
      case "ready":
        return t("آماده تحویل", "Ready", "جاهز");
      case "served":
        return t("سرو شده", "Served", "تم التقديم");
      case "paid":
        return t("تسویه شده", "Paid", "مدفوع");
      case "cancelled":
        return t("لغو شده", "Cancelled", "ملغى");
    }
  };

  const tierBadgeLabel = (level: string) => {
    switch (level) {
      case "platinum":
        return t("پلاتینیوم", "Platinum", "بلاتيني");
      case "gold":
        return t("طلایی", "Gold", "ذهبي");
      case "silver":
        return t("نقره‌ای", "Silver", "فضي");
      default:
        return t("برنزی", "Bronze", "برونزي");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-amber-600" />
              {step === "account" && portal
                ? t(
                    `حساب کاربری و فاکتورهای ${portal.customer.name}`,
                    `${portal.customer.name}'s Account & Invoices`,
                    `حساب وفواتير ${portal.customer.name}`,
                  )
                : t(
                    "ورود مشتری با شماره موبایل و کد یکبارمصرف (OTP)",
                    "Customer Mobile & OTP Login",
                    "تسجيل دخول العميل برقم الجوال ورمز التحقق",
                  )}
            </DialogTitle>
            <DialogDescription>
              {step === "account"
                ? t(
                    "مشاهده فاکتورهای سابق، وضعیت سفارش‌ها، امتیاز وفاداری و کوپن‌های تخفیف",
                    "View your past invoices, order history, loyalty points, and discount vouchers",
                    "عرض الفواتير السابقة وسجل الطلبات ونقاط الولاء والكوبونات",
                  )
                : t(
                    "شماره موبایل خود را وارد کنید تا کد تایید یکبارمصرف (OTP) برایتان پیامک شود",
                    "Enter your mobile number to receive a one-time verification code (OTP)",
                    "أدخل رقم جوالك لاستلام رمز التحقق لمرة واحدة",
                  )}
            </DialogDescription>
          </DialogHeader>

          {step === "phone" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust-otp-mobile">
                  {t("شماره موبایل مشتری", "Customer Mobile Number", "رقم جوال العميل")}
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cust-otp-mobile"
                    dir="ltr"
                    placeholder="09121112233"
                    value={mobile}
                    onChange={(e) => setMobile(toEnglishDigits(e.target.value))}
                    className="ps-9 text-center font-mono text-base tracking-wider"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  {t(
                    "شماره‌های نمونه دارای فاکتورهای سابق جهت تست سریع:",
                    "Sample customer accounts with past invoices for quick testing:",
                    "حسابات تجريبية مع فواتير سابقة للاختبار السريع:",
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setMobile("09121112233");
                      void handleRequestOtp("09121112233");
                    }}
                  >
                    {t("سارا محمدی (09121112233)", "Sara Mohammadi (09121112233)", "سارا محمدي")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setMobile("09123334455");
                      void handleRequestOtp("09123334455");
                    }}
                  >
                    {t(
                      "امیرحسین رضایی (09123334455)",
                      "Amirhossein Rezaei (09123334455)",
                      "أمير حسين رضايي",
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                className="w-full gap-2"
                disabled={loading}
                onClick={() => void handleRequestOtp()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {t(
                  "دریافت کد یکبارمصرف (OTP)",
                  "Send One-Time Password (OTP)",
                  "إرسال رمز التحقق لمرة واحدة",
                )}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {t("شماره موبایل:", "Mobile:", "رقم الجوال:")}{" "}
                    <strong dir="ltr" className="font-mono">
                      {localizeDigits(mobile, lang)}
                    </strong>
                  </span>
                  <Badge variant="outline">
                    {provider === "mediana"
                      ? t("درگاه مدیانا", "Mediana Gateway", "بوابة مديانا")
                      : t("درگاه ملی پیامک", "MeliPayamak Gateway", "بوابة ملي پیامک")}
                  </Badge>
                </div>
                {gatewayMsg && <p className="mt-1.5 text-muted-foreground">{gatewayMsg}</p>}
              </div>

              {sandboxCode && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {t(
                        "پیامک دریافتی (پیش‌نمایش کد یکبارمصرف):",
                        "Received SMS (Preview OTP Code):",
                        "الرسالة المستلمة (رمز التحقق):",
                      )}
                    </p>
                    <p className="font-mono text-lg font-bold tracking-widest text-emerald-700 dark:text-emerald-200">
                      {localizeDigits(sandboxCode, lang)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setOtpCode(sandboxCode)}
                  >
                    {t("جایگذاری خودکار", "Auto-fill", "تعبئة تلقائية")}
                  </Button>
                </div>
              )}

              {!isExisting && (
                <div className="space-y-1.5">
                  <Label>
                    {t(
                      "نام و نام خانوادگی (جهت صدور فاکتور)",
                      "Full Name (for Invoices)",
                      "الاسم الكامل (للفواتير)",
                    )}
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t("مثلاً: علی علوی", "e.g., Ali Alavi", "مثال: علي علوي")}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="otp-code-input">
                  {t("کد یکبارمصرف ۵ رقمی", "5-Digit OTP Code", "رمز التحقق المكون من 5 أرقام")}
                </Label>
                <Input
                  id="otp-code-input"
                  dir="ltr"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(toEnglishDigits(e.target.value))}
                  placeholder="12345"
                  className="text-center font-mono text-xl font-bold tracking-[0.4em]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {countdown > 0
                    ? t(
                        `زمان باقی‌مانده: ${formatNumber(countdown)} ثانیه`,
                        `Time remaining: ${formatNumber(countdown)}s`,
                        `الوقت المتبقي: ${formatNumber(countdown)} ثانية`,
                      )
                    : t("کد منقضی شد", "Code expired", "انتهت صلاحية الرمز")}
                </span>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="font-medium text-primary hover:underline"
                >
                  {t("تغییر شماره موبایل", "Change mobile number", "تغيير رقم الجوال")}
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1 gap-2"
                  disabled={loading}
                  onClick={() => void handleVerifyOtp()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {t(
                    "تایید کد و ورود به حساب کاربری",
                    "Verify & Sign In",
                    "تأكيد الرمز وتسجيل الدخول",
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || countdown > 150}
                  onClick={() => void handleRequestOtp()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "account" && portal && (
            <div className="space-y-5 py-1">
              {/* Top Customer Summary Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{portal.customer.name}</h3>
                      <Badge className="bg-amber-600 text-white">
                        {t("سطح", "Tier", "المستوى")}:{" "}
                        {tierBadgeLabel(portal.customer.loyalty_level)}
                      </Badge>
                    </div>
                    <p dir="ltr" className="text-xs font-mono text-muted-foreground">
                      {localizeDigits(portal.customer.mobile, lang)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {isEnabled("loyalty") && (
                    <>
                      <div className="text-center">
                        <p className="text-[11px] text-muted-foreground">
                          {t("امتیاز وفاداری", "Loyalty Points", "نقاط الولاء")}
                        </p>
                        <p className="text-lg font-extrabold text-amber-600">
                          {formatNumber(portal.customer.loyalty_points)}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                    </>
                  )}
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {t("فاکتورهای ثبت‌شده", "Total Invoices", "إجمالي الفواتير")}
                    </p>
                    <p className="text-lg font-extrabold">{formatNumber(portal.orders.length)}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {t("مجموع خرید", "Total Spent", "إجمالي المشتريات")}
                    </p>
                    <p className="text-sm font-bold">
                      {formatMoney(portal.customer.total_spent, currencySymbol)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("خروج", "Logout", "خروج")}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="invoices" className="w-full" dir={dir}>
                <TabsList className="flex w-full flex-wrap">
                  <TabsTrigger value="invoices" className="flex-1 gap-1.5 text-xs">
                    <Receipt className="h-3.5 w-3.5" />
                    {t("فاکتورهای سابق", "Past Invoices", "الفواتير السابقة")} (
                    {formatNumber(portal.orders.length)})
                  </TabsTrigger>
                  {(isEnabled("vouchers") || isEnabled("rewards") || isEnabled("loyalty")) && (
                    <TabsTrigger value="rewards" className="flex-1 gap-1.5 text-xs">
                      <Gift className="h-3.5 w-3.5" />
                      {t("جوایز و کوپن‌ها", "Rewards & Vouchers", "المكافآت والكوبونات")}
                    </TabsTrigger>
                  )}
                  {isEnabled("reservations") && (
                    <TabsTrigger value="reservations" className="flex-1 gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {t("رزروهای میز", "Reservations", "الحجوزات")} (
                      {formatNumber(portal.reservations.length)})
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="profile" className="flex-1 gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5" />
                    {t("مشخصات حساب", "Profile", "الملف الشخصي")}
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: PAST INVOICES */}
                <TabsContent value="invoices" className="mt-4 space-y-3">
                  {portal.orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                      {t(
                        "هنوز فاکتوری برای این شماره موبایل ثبت نشده است.",
                        "No invoices found for this mobile number yet.",
                        "لا توجد فواتير مسجلة لهذا الرقم حتى الآن.",
                      )}
                    </div>
                  ) : (
                    portal.orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-base font-extrabold text-primary">
                              #{formatNumber(ord.order_number)}
                            </span>
                            <Badge
                              variant={
                                ord.status === "paid" || ord.status === "served"
                                  ? "default"
                                  : ord.status === "cancelled"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {statusLabel(ord.status)}
                            </Badge>
                            <Badge variant="outline">
                              {ord.order_type === "dine_in"
                                ? `${t("سالن", "Dine-in", "داخل الصالة")}${ord.table_name ? ` (${ord.table_name})` : ""}`
                                : ord.order_type === "takeaway"
                                  ? t("بیرون‌بر", "Takeaway", "سفري")
                                  : t("ارسال با پیک", "Delivery", "توصيل")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDateTime(ord.created_at)}</span>
                          </div>
                        </div>

                        <div className="my-3 space-y-1.5">
                          {ord.items.map((item, idx) => (
                            <div
                              key={`${ord.id}-item-${idx}`}
                              className="flex items-center justify-between text-xs"
                            >
                              <span>
                                {item.item_name}
                                {item.option_label ? ` (${item.option_label})` : ""} ×{" "}
                                <strong>{formatNumber(item.quantity)}</strong>
                              </span>
                              <span className="font-medium">
                                {formatMoney(item.line_total, currencySymbol)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                          <div className="space-y-0.5 text-xs">
                            {ord.discount_amount > 0 && (
                              <p className="text-emerald-600">
                                {t("تخفیف:", "Discount:", "الخصم:")} -
                                {formatMoney(ord.discount_amount, currencySymbol)}
                                {ord.discount_code ? ` (${ord.discount_code})` : ""}
                              </p>
                            )}
                            {ord.payment_reference && (
                              <p className="font-mono text-muted-foreground">
                                {t(
                                  "شماره پرداخت فیش کارتخوان (POS):",
                                  "POS Receipt Ref:",
                                  "رقم إيصال POS:",
                                )}{" "}
                                {ord.payment_reference}
                              </p>
                            )}
                            <p className="text-sm font-extrabold">
                              {t("مبلغ کل فاکتور:", "Invoice Total:", "إجمالي الفاتورة:")}{" "}
                              {formatMoney(ord.total, currencySymbol)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => setSelectedInvoice(ord)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {t(
                                "مشاهده و چاپ فاکتور",
                                "View & Print Invoice",
                                "عرض وطباعة الفاتورة",
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 2: REWARDS & VOUCHERS */}
                <TabsContent value="rewards" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Ticket className="h-4 w-4 text-emerald-600" />
                      {t(
                        "کوپن‌های تخفیف قابل استفاده شما",
                        "Your Active Discount Vouchers",
                        "كوبونات الخصم المتاحة لك",
                      )}
                    </h4>
                    {portal.vouchers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("کوپن فعالی یافت نشد.", "No active vouchers.", "لا توجد كوبونات نشطة.")}
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {portal.vouchers.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
                          >
                            <div>
                              <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                {v.code}
                              </p>
                              <p className="text-xs text-muted-foreground">{v.title}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={() => {
                                if (onApplyVoucherCode) {
                                  onApplyVoucherCode(v.code);
                                  toast.success(
                                    t(
                                      `کد تخفیف ${v.code} در سبد خرید قرار گرفت`,
                                      `Voucher ${v.code} applied`,
                                      `تم تطبيق الكوبون ${v.code}`,
                                    ),
                                  );
                                } else {
                                  navigator.clipboard?.writeText(v.code);
                                  toast.success(t("کد کپی شد", "Code copied", "تم نسخ الرمز"));
                                }
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              {t("استفاده", "Use", "استخدام")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {t(
                        "دریافت جایزه با امتیاز وفاداری",
                        "Redeem Loyalty Points for Rewards",
                        "استبدال النقاط بالمكافآت",
                      )}
                    </h4>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {portal.rewards.map((rew) => {
                        const canAfford = portal.customer.loyalty_points >= rew.points_cost;
                        return (
                          <div
                            key={rew.id}
                            className="flex flex-col justify-between rounded-xl border p-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{rew.title}</span>
                                <Badge variant="secondary">
                                  {formatNumber(rew.points_cost)} {t("امتیاز", "pts", "نقطة")}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {rew.description}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="mt-3 w-full"
                              disabled={!canAfford || loading}
                              onClick={() => void handleRedeemReward(rew.id)}
                            >
                              {canAfford
                                ? t("دریافت جایزه", "Redeem Reward", "استبدال المكافأة")
                                : t("امتیاز ناکافی", "Insufficient Points", "نقاط غير كافية")}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {portal.ledger.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Award className="h-4 w-4 text-primary" />
                        {t(
                          "گردش امتیازات وفاداری (تاریخ شمسی)",
                          "Loyalty Points History (Jalali)",
                          "سجل نقاط الولاء",
                        )}
                      </h4>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border p-2.5">
                        {portal.ledger.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between border-b pb-1.5 text-xs last:border-b-0 last:pb-0"
                          >
                            <div>
                              <span className="font-medium">{entry.note}</span>
                              <span className="ms-2 text-[11px] text-muted-foreground">
                                ({formatDateTime(entry.created_at)})
                              </span>
                            </div>
                            <span
                              className={`font-bold ${
                                entry.delta >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {entry.delta >= 0
                                ? `+${formatNumber(entry.delta)}`
                                : formatNumber(entry.delta)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: RESERVATIONS */}
                <TabsContent value="reservations" className="mt-4 space-y-2.5">
                  {portal.reservations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                      {t(
                        "رزروی برای این شماره ثبت نشده است.",
                        "No table reservations found.",
                        "لا توجد حجوزات مسجلة.",
                      )}
                    </div>
                  ) : (
                    portal.reservations.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {res.table_name} — {formatNumber(res.guests)}{" "}
                            {t("نفر", "guests", "ضيوف")}
                          </p>
                          <p className="text-muted-foreground">
                            {t("تاریخ شمسی:", "Jalali Date:", "التاريخ الشمسي:")}{" "}
                            <strong>{formatDate(res.reservation_date)}</strong> |{" "}
                            {t("ساعت:", "Time:", "الوقت:")}{" "}
                            <strong>{localizeDigits(res.start_time, lang)}</strong>
                          </p>
                          {res.notes && <p className="text-muted-foreground">{res.notes}</p>}
                        </div>
                        <Badge
                          variant={
                            res.status === "confirmed"
                              ? "default"
                              : res.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {res.status === "confirmed"
                            ? t("تایید شده", "Confirmed", "مؤكد")
                            : res.status === "completed"
                              ? t("انجام شده", "Completed", "مكتمل")
                              : res.status === "cancelled"
                                ? t("لغو شده", "Cancelled", "ملغى")
                                : t("در انتظار تایید", "Pending", "قيد الانتظار")}
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 4: PROFILE */}
                <TabsContent value="profile" className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("نام و نام خانوادگی", "Full Name", "الاسم الكامل")}</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        {t("شماره موبایل تایید شده", "Verified Mobile", "رقم الجوال المؤكد")}
                      </Label>
                      <Input
                        dir="ltr"
                        disabled
                        value={localizeDigits(portal.customer.mobile, lang)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {t(
                        "ذائقه و یادداشت پیش‌فرض سفارش (مثلاً: کم‌شیرین، شیر جو دوسر)",
                        "Default Order Preferences & Notes",
                        "تفضيلات الطلب الافتراضية",
                      )}
                    </Label>
                    <Input
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder={t(
                        "مثلاً: لاته با شیر بادام، بدون شکر",
                        "e.g., Oat milk latte, no sugar",
                        "مثال: لاتيه بحليب الشوفان",
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfile()}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("ذخیره تغییرات حساب", "Save Profile Changes", "حفظ التغييرات")}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Invoice Receipt Modal */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(v) => !v && setSelectedInvoice(null)}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {t("فاکتور رسمی خرید", "Official Order Invoice", "فاتورة الطلب الرسمية")}{" "}
                {selectedInvoice ? `#${formatNumber(selectedInvoice.order_number)}` : ""}
              </span>
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice ? formatDateTime(selectedInvoice.created_at) : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4 text-xs">
              <div className="border-b pb-2 text-center">
                <p className="text-base font-bold">
                  {t("کافه رستوران هالی", "Hally Cafe & Restaurant", "مقهى ومطعم هالي")}
                </p>
                <p className="text-muted-foreground">
                  {t("تاریخ صدور (شمسی):", "Issue Date (Jalali):", "تاريخ الإصدار:")}{" "}
                  {formatDateTime(selectedInvoice.created_at)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 border-b pb-2">
                <span>
                  {t("مشتری:", "Customer:", "العميل:")}{" "}
                  <strong>{selectedInvoice.customer_name}</strong>
                </span>
                <span dir="ltr" className="text-end font-mono">
                  {localizeDigits(selectedInvoice.customer_phone, lang)}
                </span>
                <span>
                  {t("نوع سفارش:", "Type:", "النوع:")}{" "}
                  <strong>
                    {selectedInvoice.order_type === "dine_in"
                      ? t("سالن", "Dine-in", "صالة")
                      : selectedInvoice.order_type === "takeaway"
                        ? t("بیرون‌بر", "Takeaway", "سفري")
                        : t("پیک", "Delivery", "توصيل")}
                  </strong>
                </span>
                <span className="text-end">
                  {t("وضعیت:", "Status:", "الحالة:")}{" "}
                  <strong>{statusLabel(selectedInvoice.status)}</strong>
                </span>
                {selectedInvoice.payment_reference && (
                  <span className="col-span-2 font-mono text-primary">
                    {t(
                      "شماره پرداخت فیش کارتخوان (POS):",
                      "POS Receipt Tracking #:",
                      "رقم إيصال جهاز نقاط البيع:",
                    )}{" "}
                    <strong>{selectedInvoice.payment_reference}</strong>
                  </span>
                )}
              </div>

              <div className="space-y-1.5 border-b pb-2">
                {selectedInvoice.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>
                      {it.item_name}
                      {it.option_label ? ` (${it.option_label})` : ""} × {formatNumber(it.quantity)}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(it.line_total, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t("جمع اقلام:", "Subtotal:", "المجموع الفرعي:")}</span>
                  <span>{formatMoney(selectedInvoice.subtotal, currencySymbol)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>
                      {t("تخفیف:", "Discount:", "الخصم:")}{" "}
                      {selectedInvoice.discount_code ? `(${selectedInvoice.discount_code})` : ""}
                    </span>
                    <span>-{formatMoney(selectedInvoice.discount_amount, currencySymbol)}</span>
                  </div>
                )}
                {selectedInvoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>{t("مالیات:", "Tax:", "الضريبة:")}</span>
                    <span>{formatMoney(selectedInvoice.tax_amount, currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-sm font-extrabold">
                  <span>{t("مبلغ نهایی فاکتور:", "Total Payable:", "الإجمالي النهائي:")}</span>
                  <span>{formatMoney(selectedInvoice.total, currencySymbol)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("چاپ فاکتور", "Print Invoice", "طباعة الفاتورة")}
                </Button>
                <Button type="button" size="sm" onClick={() => setSelectedInvoice(null)}>
                  {t("بستن", "Close", "إغلاق")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
