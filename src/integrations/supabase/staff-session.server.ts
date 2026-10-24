import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { StaffUser } from "@/lib/hally-types";

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const STAFF_PIN_HASH_PATTERN = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i;
const DUMMY_STAFF_PIN_HASH = hashStaffPin(randomBytes(32).toString("hex"));

export type StaffSessionIdentity = {
  staffId: string;
  credentialFingerprint: string;
};

export function isStaffPinHash(value: string): boolean {
  return STAFF_PIN_HASH_PATTERN.test(value);
}

export function hashStaffPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyStaffPin(pin: string, storedValue: string): boolean {
  if (!isStaffPinHash(storedValue)) return false;

  const [, salt, encodedHash] = storedValue.split("$");
  if (!salt || !encodedHash) return false;
  const expectedHash = Buffer.from(encodedHash, "hex");
  const actualHash = scryptSync(pin, salt, expectedHash.length);
  return timingSafeEqual(actualHash, expectedHash);
}

export function performDummyStaffPinVerification(pin: string): void {
  verifyStaffPin(pin, DUMMY_STAFF_PIN_HASH);
}

function sessionSecret(): string {
  const secret = process.env["HALLY_STAFF_SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("HALLY_STAFF_SESSION_SECRET must contain at least 32 characters");
  }
  return secret;
}

export function getStaffCredentialFingerprint(staff: Pick<StaffUser, "pin" | "role">): string {
  return createHash("sha256").update(`${staff.pin}\0${staff.role}`).digest("hex");
}

export function createStaffSessionToken(staff: StaffUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: staff.id,
      fingerprint: getStaffCredentialFingerprint(staff),
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyStaffSessionToken(token: string): StaffSessionIdentity | null {
  if (token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  let receivedSignature: Buffer;
  try {
    receivedSignature = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", sessionSecret()).update(payload).digest();
  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      fingerprint?: unknown;
      exp?: unknown;
    };
    if (
      typeof claims.sub !== "string" ||
      typeof claims.fingerprint !== "string" ||
      typeof claims.exp !== "number" ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { staffId: claims.sub, credentialFingerprint: claims.fingerprint };
  } catch {
    return null;
  }
}
