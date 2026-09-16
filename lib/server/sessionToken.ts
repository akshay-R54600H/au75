// ============================================================
// Stateless portal-session token (server-only)
//
// Vercel functions do not share memory between invocations, so the
// CAPTCHA → login → OTP flow cannot park a cookie jar in a Map. We
// seal the session state (portal cookies + the two form targets) into
// an AES-256-GCM token that the client hands back on the next step.
// The client only ever sees ciphertext; it expires after TTL.
// ============================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface SessionState {
  stage: "captcha" | "session";
  cookies: Record<string, string>;
  sessionToken: string | null;
  loginAction: string;
  loginReferer: string | null;
  otpForm: { action: string; fields: Record<string, string>; otpField: string } | null;
  exp: number;
}

const TTL_MS = 10 * 60_000;

// ponytail: no PORTAL_SESSION_SECRET → random per-process key. Fine for
// `next dev`; on Vercel set the env var or every cold start invalidates
// in-flight logins.
const KEY_SLOT = Symbol.for("au75.sessionKey");
function key(): Buffer {
  const g = globalThis as Record<symbol, Buffer | undefined>;
  if (!g[KEY_SLOT]) {
    const secret = process.env.PORTAL_SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      console.warn("[portal] PORTAL_SESSION_SECRET is not set — sessions won't survive cold starts.");
    }
    g[KEY_SLOT] = secret
      ? createHash("sha256").update(secret).digest()
      : randomBytes(32);
  }
  return g[KEY_SLOT]!;
}

export function seal(state: Omit<SessionState, "exp">): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plain = Buffer.from(JSON.stringify({ ...state, exp: Date.now() + TTL_MS }));
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

export function open(token: string): SessionState | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const state = JSON.parse(
      Buffer.concat([decipher.update(enc), decipher.final()]).toString()
    ) as SessionState;
    return Date.now() > state.exp ? null : state;
  } catch {
    return null;
  }
}
