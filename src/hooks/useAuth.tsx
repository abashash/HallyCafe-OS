import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLE_LABELS,
  type StaffPermissions,
  type StaffRole,
  type StaffUser,
} from "@/lib/hally-types";

export const HALLY_STAFF_SESSION_KEY = "hally_staff_session_v1";

export function getSavedStaffSession(): StaffUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HALLY_STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffUser;
    if (parsed && parsed.id && parsed.username && parsed.role) {
      return {
        ...parsed,
        permissions: {
          ...(DEFAULT_ROLE_PERMISSIONS[parsed.role] ?? DEFAULT_ROLE_PERMISSIONS.guest),
          ...(parsed.permissions ?? {}),
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStaffSession(user: StaffUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      window.localStorage.removeItem(HALLY_STAFF_SESSION_KEY);
    } else {
      window.localStorage.setItem(HALLY_STAFF_SESSION_KEY, JSON.stringify(user));
    }
  } catch {
    // ignore storage errors
  }
}

type AuthState = {
  user: User | null;
  session: Session | null;
  staffUser: StaffUser | null;
  activeRole: StaffRole;
  activeRoleLabel: string;
  activeUserName: string;
  activeUserId: string | null;
  permissions: StaffPermissions;
  hasPermission: (key: keyof StaffPermissions) => boolean;
  /** آیا کاربر مدیر کل یا مدیر داخلی است */
  isAdmin: boolean;
  /** آیا کاربر (مدیر یا پرسنل) وارد سیستم شده است */
  isAuthenticated: boolean;
  loading: boolean;
  loginAsStaff: (staff: StaffUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  staffUser: null,
  activeRole: "guest",
  activeRoleLabel: STAFF_ROLE_LABELS.guest,
  activeUserName: "مهمان",
  activeUserId: null,
  permissions: DEFAULT_ROLE_PERMISSIONS.guest,
  hasPermission: () => false,
  isAdmin: false,
  isAuthenticated: false,
  loading: true,
  loginAsStaff: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => getSavedStaffSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStaffUser(getSavedStaffSession());
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isSupabaseAdmin = Boolean(session?.user);
  const activeRole: StaffRole = staffUser ? staffUser.role : isSupabaseAdmin ? "admin" : "guest";

  const permissions: StaffPermissions = staffUser
    ? {
        ...(DEFAULT_ROLE_PERMISSIONS[staffUser.role] ?? DEFAULT_ROLE_PERMISSIONS.guest),
        ...(staffUser.permissions ?? {}),
      }
    : isSupabaseAdmin
      ? DEFAULT_ROLE_PERMISSIONS.admin
      : DEFAULT_ROLE_PERMISSIONS.guest;

  const activeUserName = staffUser
    ? staffUser.name
    : session?.user?.email
      ? `مدیر (${session.user.email})`
      : "مهمان";

  const activeUserId = staffUser?.id ?? session?.user?.id ?? null;
  const isAdmin = isSupabaseAdmin || activeRole === "admin" || activeRole === "manager";
  const isAuthenticated = Boolean(isSupabaseAdmin || staffUser);

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    staffUser,
    activeRole,
    activeRoleLabel: STAFF_ROLE_LABELS[activeRole] ?? activeRole,
    activeUserName,
    activeUserId,
    permissions,
    hasPermission: (key: keyof StaffPermissions) => Boolean(permissions[key]),
    isAdmin,
    isAuthenticated,
    loading,
    loginAsStaff: (staff: StaffUser) => {
      saveStaffSession(staff);
      setStaffUser(staff);
    },
    signOut: async () => {
      saveStaffSession(null);
      setStaffUser(null);
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
