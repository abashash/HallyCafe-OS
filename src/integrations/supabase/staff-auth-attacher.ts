import { createMiddleware } from "@tanstack/react-start";
import { HALLY_STAFF_SESSION_HEADER, HALLY_STAFF_SESSION_TOKEN_KEY } from "./staff-session-shared";

export const attachHallyStaffSession = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(HALLY_STAFF_SESSION_TOKEN_KEY);
    return next({
      headers: token ? { [HALLY_STAFF_SESSION_HEADER]: token } : {},
    });
  },
);
