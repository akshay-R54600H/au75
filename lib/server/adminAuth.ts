import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "au75_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AdminSession {
  email: string;
  role: "admin";
  iat: number;
  exp: number;
}

// Global cached session key derived from secret
const KEY_SLOT = Symbol.for("au75.adminSessionKey");
function getEncryptionKey(): Buffer {
  const g = globalThis as unknown as Record<symbol, Buffer | undefined>;
  if (!g[KEY_SLOT]) {
    const secret =
      process.env.ADMIN_SESSION_SECRET ||
      process.env.PORTAL_SESSION_SECRET ||
      "au75-admin-fallback-session-secret-change-in-production";

    if (!process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === "production") {
      console.warn(
        "[adminAuth] ADMIN_SESSION_SECRET is not set in production. Please set it in Vercel environment variables."
      );
    }
    g[KEY_SLOT] = createHash("sha256").update(secret).digest();
  }
  return g[KEY_SLOT]!;
}

/** Get configured admin credentials from server-side environment variables. */
export function getAdminCredentials(): { email: string; passwordHash: Buffer } {
  const email = (process.env.ADMIN_EMAIL || "admin@au75.vercel.app").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Harsha@2009";
  // Hash the expected password with sha256 to allow constant-time comparison
  const passwordHash = createHash("sha256").update(password).digest();
  return { email, passwordHash };
}

/** Timing-safe validation of admin credentials. */
export function verifyAdminCredentials(inputEmail: string, inputPassword: string): boolean {
  if (!inputEmail || !inputPassword) return false;

  const { email: expectedEmail, passwordHash: expectedHash } = getAdminCredentials();
  const normalizedInputEmail = inputEmail.trim().toLowerCase();

  const isEmailMatch = normalizedInputEmail === expectedEmail;
  const inputHash = createHash("sha256").update(inputPassword).digest();
  const isPasswordMatch = timingSafeEqual(inputHash, expectedHash);

  return isEmailMatch && isPasswordMatch;
}

/** Seal session into an encrypted, signed AES-256-GCM token. */
export function sealAdminSession(email: string): string {
  const now = Date.now();
  const session: AdminSession = {
    email: email.trim().toLowerCase(),
    role: "admin",
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plain = Buffer.from(JSON.stringify(session), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv (12b) + tag (16b) + ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** Open and verify the sealed admin session token. */
export function openAdminSession(token: string): AdminSession | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 28) return null; // 12 (iv) + 16 (tag) = 28 bytes minimum

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    const session = JSON.parse(plain.toString("utf8")) as AdminSession;

    if (!session || session.role !== "admin" || Date.now() > session.exp) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/** Extract and verify the admin session from request cookies. */
export function getAdminSessionFromRequest(req: NextRequest): AdminSession | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return openAdminSession(token);
}

/** Set the secure HTTP-only admin session cookie on a NextResponse. */
export function setAdminSessionCookie(res: NextResponse, email: string): void {
  const token = sealAdminSession(email);
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Clear the admin session cookie on a NextResponse. */
export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// In-memory sliding-window rate limiter for brute-force protection
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count += 1;
  }
}

export function resetFailedLogin(ip: string): void {
  rateLimitMap.delete(ip);
}
