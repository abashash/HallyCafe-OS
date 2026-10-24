import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Coffee,
  KeyRound,
  Lock,
  ShieldCheck,
  Smartphone,
  Tablet,
  UserCheck,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSavedStaffSession, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { requestStaffOtp, verifyStaffCredentials, verifyStaffOtp } from "@/lib/hally-os.functions";
import { STAFF_ROLE_LABELS } from "@/lib/hally-types";
import { useI18n } from "@/lib/i18n";
import { toEnglishDigits } from "@/lib/jalali";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ورود اختصاصی پرسنل کافه | کافه هالی" },
      {
        name: "description",
        content:
          "ورود با شماره موبایل و کد یکبارمصرف اختصاصی پرسنل، صندوقدار، ویترس و مدیریت کافه هالی.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { dir, t } = useI18n();
  const { loginAsStaff, isAdmin } = useAuth();

  // Mobile + OTP state
  const [mobile, setMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [staffTargetName, setStaffTargetName] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  // Username + PIN state (fallback)
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  // Admin Supabase email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existingStaff = getSavedStaffSession();
    if (existingStaff) {
      navigate({ to: existingStaff.role === "waiter" ? "/pos" : "/dashboard" });
      return;
    }
    if (isAdmin) navigate({ to: "/dashboard" });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleRequestStaffOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const m = toEnglishDigits(mobile).trim();
    if (!m) {
      toast.error(t("شماره موبایل پرسنل را وارد کنید", "Enter staff mobile", "أدخل رقم الجوال"));
      return;
    }
    setBusy(true);
    try {
      const res = await requestStaffOtp({ data: { mobile: m } });
      setOtpSent(true);
      setStaffTargetName(`${res.staff_name} (${res.staff_role})`);
      setCountdown(res.expires_in_sec || 180);
      if (res.sandbox_code) {
        setSandboxCode(res.sandbox_code);
        setOtpCode(res.sandbox_code);
      }
      toast.success(
        t(
          `کد یکبارمصرف برای ${res.staff_name} ارسال شد.`,
          `OTP code sent for ${res.staff_name}.`,
          `تم إرسال رمز التحقق إلى ${res.staff_name}.`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ارسال کد یکبارمصرف");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyStaffOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const m = toEnglishDigits(mobile).trim();
    const c = toEnglishDigits(otpCode).trim();
    if (!m || !c) {
      toast.error(
        t(
          "شماره موبایل و کد یکبارمصرف را وارد کنید",
          "Enter mobile & OTP",
          "أدخل رقم الجوال ورمز التحقق",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const login = await verifyStaffOtp({ data: { mobile: m, code: c } });
      const { staff, session_token } = login;
      loginAsStaff(staff, session_token);
      toast.success(
        t(
          `${staff.name} (${STAFF_ROLE_LABELS[staff.role]}) خوش آمدید!`,
          `Welcome, ${staff.name}!`,
          `مرحباً بك ${staff.name}!`,
        ),
      );
      if (staff.role === "waiter" || staff.role === "cashier") {
        navigate({ to: "/pos" });
      } else if (staff.role === "chef") {
        navigate({ to: "/kds" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "کد یکبارمصرف نامعتبر است");
    } finally {
      setBusy(false);
    }
  }

  async function handleStaffLogin(e?: React.FormEvent, customUser?: string, customPin?: string) {
    e?.preventDefault();
    const u = toEnglishDigits(customUser ?? username).trim();
    const p = toEnglishDigits(customPin ?? pin).trim();
    if (!u || !p) {
      toast.error(
        t("نام کاربری و پین را وارد کنید", "Enter username & PIN", "أدخل اسم المستخدم والرمز"),
      );
      return;
    }
    setBusy(true);
    try {
      const login = await verifyStaffCredentials({ data: { username: u, pin: p } });
      const { staff, session_token } = login;
      loginAsStaff(staff, session_token);
      toast.success(
        t(
          `${staff.name} (${STAFF_ROLE_LABELS[staff.role]}) خوش آمدید!`,
          `Welcome, ${staff.name}!`,
          `مرحباً بك ${staff.name}!`,
        ),
      );
      if (staff.role === "waiter" || staff.role === "cashier") {
        navigate({ to: "/pos" });
      } else if (staff.role === "chef") {
        navigate({ to: "/kds" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ورود پرسنل");
    } finally {
      setBusy(false);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(t("ورود ناموفق: ", "Sign-in failed: ", "فشل الدخول: ") + error.message);
      return;
    }
    toast.success(t("خوش آمدید", "Welcome back", "مرحباً بك"));
    navigate({ to: "/dashboard" });
  }

  return (
    <main
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4 py-10"
    >
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Coffee className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">
            {t("کافه هالی (Hally OS)", "Hally Business OS", "نظام مقهى هالي")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "سامانه جامع مدیریت عملیات کافه، ویترس تبلت و کنترل بهای تمام‌شده",
              "Cafe Operations, Waiter Tablet & Cost Control System",
              "النظام الشامل لإدارة المقهى والنادل والتحكم بالتكاليف",
            )}
          </p>
          <LanguageSwitcher variant="admin" className="mt-1" />
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              {t("ورود اختصاصی پرسنل کافه هالی", "Staff Authentication", "دخول طاقم العمل والمدير")}
            </CardTitle>
            <CardDescription>
              {t(
                "پرسنل کافه (مدیریت، ویترس، صندوقدار و سرآشپز) می‌توانند با شماره موبایل و کد یکبارمصرف وارد شوند.",
                "Staff members (Managers, Waiters, Cashiers, Chefs) authenticate with their registered mobile number and OTP.",
                "يمكن لموظفي المقهى تسجيل الدخول برقم الجوال ورمز التحقق.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Clear Separation Note between Staff and Guests */}
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCheck className="size-4 shrink-0 text-primary" />
                <span>
                  {t(
                    "مهمان یا مشتری کافه هستید؟",
                    "Are you a cafe guest?",
                    "هل أنت عميل أو زائر للمقهى؟",
                  )}
                </span>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/online-menu">
                  {t("منوی آنلاین و فاکتورها", "Online Menu & Invoices", "القائمة والفواتير")}
                  <ArrowRight className="size-3 ms-1" />
                </Link>
              </Button>
            </div>

            <Tabs defaultValue="staff_otp" dir={dir}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="staff_otp" className="gap-1 text-xs">
                  <Smartphone className="size-3.5" />
                  {t("موبایل و پیامک (OTP)", "Mobile OTP", "الجوال ورمز التحقق")}
                </TabsTrigger>
                <TabsTrigger value="staff_pin" className="gap-1 text-xs">
                  <Tablet className="size-3.5" />
                  {t("پین پرسنل / تبلت", "PIN / Tablet", "الرمز / التابلت")}
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-1 text-xs">
                  <ShieldCheck className="size-3.5" />
                  {t("ایمیل مدیریت", "Admin Email", "البريد الإلكتروني")}
                </TabsTrigger>
              </TabsList>

              {/* 1. Mobile + OTP Tab (Requested by User) */}
              <TabsContent value="staff_otp" className="mt-4 space-y-4">
                {!otpSent ? (
                  <form className="space-y-3" onSubmit={handleRequestStaffOtp}>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-mobile">
                        {t(
                          "شماره موبایل ثبت‌شده پرسنل",
                          "Staff Registered Mobile",
                          "رقم جوال الموظف",
                        )}
                      </Label>
                      <Input
                        id="staff-mobile"
                        dir="ltr"
                        value={mobile}
                        onChange={(e) => setMobile(toEnglishDigits(e.target.value))}
                        placeholder="09120000001"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={busy}>
                      <Smartphone className="size-4" />
                      {t("ارسال کد یکبارمصرف ورود (OTP)", "Send OTP Code", "إرسال رمز التحقق")}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-3" onSubmit={handleVerifyStaffOtp}>
                    <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("پرسنل:", "Staff:", "الموظف:")}
                        </span>
                        <strong className="font-bold text-foreground">{staffTargetName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("ارسال به شماره:", "Sent to:", "أرسل إلى:")}
                        </span>
                        <span dir="ltr" className="font-mono font-bold">
                          {mobile}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="staff-otp">
                        {t("کد ۵ رقمی یکبارمصرف", "5-Digit Verification Code", "رمز التحقق")}
                      </Label>
                      <Input
                        id="staff-otp"
                        dir="ltr"
                        className="text-center font-mono text-lg tracking-widest"
                        maxLength={5}
                        value={otpCode}
                        onChange={(e) => setOtpCode(toEnglishDigits(e.target.value))}
                        placeholder="•••••"
                        required
                        autoFocus
                      />
                    </div>

                    {sandboxCode && (
                      <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                        <span className="text-amber-800 dark:text-amber-300">
                          {t("کد آزمایشی (Sandbox):", "Sandbox OTP:", "رمز تجريبي:")}{" "}
                          <strong>{sandboxCode}</strong>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-amber-900 dark:text-amber-200"
                          onClick={() => setOtpCode(sandboxCode)}
                        >
                          {t("درج خودکار", "Auto-fill", "تعبئة تلقائية")}
                        </Button>
                      </div>
                    )}

                    <Button type="submit" className="w-full gap-2" disabled={busy}>
                      <KeyRound className="size-4" />
                      {t("تأیید کد و ورود به سامانه", "Verify & Enter", "تأكيد والدخول")}
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                      >
                        {t("تغییر شماره موبایل", "Change Mobile", "تغيير الرقم")}
                      </Button>
                      {countdown > 0 ? (
                        <span className="text-muted-foreground font-mono">
                          {Math.floor(countdown / 60)}:
                          {(countdown % 60).toString().padStart(2, "0")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => void handleRequestStaffOtp()}
                        >
                          {t("ارسال مجدد کد", "Resend Code", "إعادة الإرسال")}
                        </Button>
                      )}
                    </div>
                  </form>
                )}

                {/* Quick select buttons for staff mobile numbers for instant test */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t(
                      "شماره‌های پرسنل برای ورود سریع با پیامک:",
                      "Staff mobile directory for quick OTP login:",
                      "أرقام الموظفين للدخول السريع:",
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { role: "مدیر کل هالی", phone: "09120000001", label: "مدیریت" },
                      { role: "ویترس سالن ۱", phone: "09120000002", label: "ویترس ۱" },
                      { role: "ویترس تراس ۲", phone: "09120000003", label: "ویترس ۲" },
                      { role: "صندوقدار کافه", phone: "09120000004", label: "صندوقدار" },
                      { role: "سرآشپز هالی", phone: "09120000005", label: "سرآشپز" },
                    ].map((st) => (
                      <Button
                        key={st.phone}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-auto justify-between py-1.5 text-xs"
                        onClick={() => {
                          setMobile(st.phone);
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                      >
                        <span>{st.label}</span>
                        <code className="text-[11px] font-mono">{st.phone}</code>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* 2. Username + PIN Tab (Fallback / Tablet) */}
              <TabsContent value="staff_pin" className="mt-4 space-y-4">
                <form className="space-y-3" onSubmit={(e) => void handleStaffLogin(e)}>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-username">
                      {t("نام کاربری پرسنل", "Staff Username", "اسم مستخدم الموظف")}
                    </Label>
                    <Input
                      id="staff-username"
                      dir="ltr"
                      value={username}
                      onChange={(e) => setUsername(toEnglishDigits(e.target.value))}
                      placeholder="waiter1"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-pin">
                      {t("کد پین / رمز ورود", "PIN / Password", "رمز الدخول")}
                    </Label>
                    <Input
                      id="staff-pin"
                      type="password"
                      dir="ltr"
                      value={pin}
                      onChange={(e) => setPin(toEnglishDigits(e.target.value))}
                      placeholder="1111"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={busy}>
                    <KeyRound className="size-4" />
                    {t("ورود با پین پرسنل", "Sign In with PIN", "دخول بالرمز")}
                  </Button>
                </form>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {t(
                      "ورود سریع آزمایشی (تبلت ویترس، مدیر کل، صندوقدار):",
                      "Quick Demo Sign-In (Waiter Tablet, Admin, Cashier):",
                      "دخول سريع تجريبي:",
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto justify-between py-2 text-xs"
                      onClick={() => {
                        setUsername("admin");
                        setPin("1234");
                        void handleStaffLogin(undefined, "admin", "1234");
                      }}
                    >
                      <span>{t("مدیر کل هالی", "Master Admin", "المدير العام")}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        admin / 1234
                      </Badge>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto justify-between py-2 text-xs"
                      onClick={() => {
                        setUsername("waiter1");
                        setPin("1111");
                        void handleStaffLogin(undefined, "waiter1", "1111");
                      }}
                    >
                      <span>
                        {t("ویترس ۱ (مجوز ویرایش/حذف)", "Waiter 1 (Full Edit)", "نادل ١")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        waiter1 / 1111
                      </Badge>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto justify-between py-2 text-xs"
                      onClick={() => {
                        setUsername("waiter2");
                        setPin("2222");
                        void handleStaffLogin(undefined, "waiter2", "2222");
                      }}
                    >
                      <span>
                        {t("ویترس ۲ (فقط ثبت سفارش)", "Waiter 2 (Create Only)", "نادل ٢")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        waiter2 / 2222
                      </Badge>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto justify-between py-2 text-xs"
                      onClick={() => {
                        setUsername("cashier");
                        setPin("3333");
                        void handleStaffLogin(undefined, "cashier", "3333");
                      }}
                    >
                      <span>{t("صندوقدار", "Cashier", "أمين الصندوق")}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        cashier / 3333
                      </Badge>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* 3. Supabase Admin Email Tab */}
              <TabsContent value="admin" className="mt-4">
                <form className="space-y-4" onSubmit={signIn}>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("ایمیل", "Email", "البريد الإلكتروني")}</Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("رمز عبور", "Password", "كلمة المرور")}</Label>
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={busy}>
                    {t("ورود با ایمیل", "Sign In with Email", "دخول بالبريد")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
