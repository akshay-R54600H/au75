// ============================================================
// Sync transport — thin fetch wrapper around /api/portal/*.
// Each step returns a sealed token that must be passed to the next.
// ============================================================

import type { Subject, ClassSession } from "@/lib/models/types";

export interface SyncPayload {
  subjects: Subject[];
  sessions: ClassSession[];
}

export interface SessionResponse {
  ok: boolean;
  token?: string;
  captcha?: string;
  error?: string;
  reason?: string;
}

export interface StartResponse {
  step?: "otp" | "done";
  token?: string;
  data?: SyncPayload;
  error?: string;
  reason?: string;
}

export interface OtpResponse {
  ok: boolean;
  data?: SyncPayload;
  error?: string;
}

async function postApi<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as T;
}

export const createSession = () => postApi<SessionResponse>("/api/portal/session");

export const submitLogin = (token: string, studentId: string, password: string, captcha: string) =>
  postApi<StartResponse>("/api/portal/start", { token, studentId, password, captcha });

export const completeOtp = (token: string, otp: string) =>
  postApi<OtpResponse>("/api/portal/verify", { token, otp });
