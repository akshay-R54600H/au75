// ============================================================
// Alliance Portal — in-app HTTP client (CapacitorHttp)
//
// Used by the packaged Android/iOS app so Sync works WITHOUT a
// proxy server: CapacitorHttp performs the requests natively (OkHttp
// on Android), which bypasses browser CORS entirely. Cookies set by
// the portal (JSESSIONID, HASH_JSESSIONID) live in the shared native
// cookie store, exactly like a browser, so the whole login → OTP →
// data flow stays on the device.
//
// The portal serves pages as iso-8859-1, so we always request raw
// bytes (responseType "arraybuffer") and decode the charset ourselves
// — a UTF-8 pass would turn the accented names into mojibake.
// ============================================================

import { CapacitorHttp } from "@capacitor/core";
import { sleep, resolvePortalUrl } from "./loginFlow";

export const PORTAL_ORIGIN = "https://student.alliance.edu.in";
export const PORTAL_BASE = `${PORTAL_ORIGIN}/auerp`;

export const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

export interface NativePortalResponse {
  status: number;
  statusText: string;
  body: string;
  finalUrl: string;
  headers: Record<string, string>;
}

export interface NativePortalBinaryResponse {
  status: number;
  /** base64 (no data: prefix) — mirror the server's Buffer.toString("base64"). */
  body: string;
  finalUrl: string;
}

export interface NativePortalHttpOptions {
  timeoutMs?: number;
  tries?: number;
}

function latin1Decode(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return out;
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

/** Normalize the raw arraybuffer payload into bytes (base64 on native). */
function bytesFromPayload(data: unknown): Uint8Array {
  if (typeof data === "string") {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("[nativeHttp] unexpected arraybuffer payload");
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(bin);
}

export class NativePortalHttp {
  lastError: string | null = null;

  constructor(
    private baseUrl: string = PORTAL_BASE,
    private origin: string = PORTAL_ORIGIN,
    private opts: NativePortalHttpOptions = {}
  ) {}

  private async raw(
    method: "GET" | "POST",
    url: string,
    body?: string,
    referer?: string,
    binary = false
  ): Promise<NativePortalResponse | NativePortalBinaryResponse> {
    const timeoutMs = this.opts.timeoutMs ?? 30000;
    const tries = this.opts.tries ?? 2;
    const fullUrl = url.startsWith("http")
      ? url
      : resolvePortalUrl(url, this.origin, this.baseUrl);

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        };
        if (referer) headers.Referer = referer;
        if (body !== undefined) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }

        const res = await CapacitorHttp.request({
          url: fullUrl,
          method,
          headers,
          data: body,
          responseType: "arraybuffer",
          connectTimeout: timeoutMs,
          readTimeout: timeoutMs,
        });

        const headersOut: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers ?? {})) {
          headersOut[k.toLowerCase()] = String(v);
        }

        const bytes = bytesFromPayload(res.data);
        this.lastError = null;

        if (binary) {
          return {
            status: res.status,
            body: toBase64(bytes),
            finalUrl: res.url ?? fullUrl,
          };
        }

        const contentType = headersOut["content-type"] ?? "";
        const bodyText = /charset=iso-8859-1|charset=latin1/i.test(contentType)
          ? latin1Decode(bytes)
          : utf8Decode(bytes);

        return {
          status: res.status,
          statusText: "",
          body: bodyText,
          finalUrl: res.url ?? fullUrl,
          headers: headersOut,
        };
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        if (attempt === tries) {
          throw new Error(
            `[nativeHttp] request failed after ${tries} tries: ${this.lastError}`
          );
        }
        await sleep(800 * attempt);
      }
    }
    throw new Error("[nativeHttp] unreachable");
  }

  async get(path: string, referer?: string): Promise<NativePortalResponse> {
    return (await this.raw("GET", path, undefined, referer)) as NativePortalResponse;
  }

  /** Fetch raw bytes (CAPTCHA images etc.) without corrupting them. */
  async getBinary(path: string, referer?: string): Promise<NativePortalBinaryResponse> {
    return (await this.raw("GET", path, undefined, referer, true)) as NativePortalBinaryResponse;
  }

  async postForm(
    path: string,
    fields: Record<string, string>,
    referer?: string
  ): Promise<NativePortalResponse> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) params.append(k, v);
    return (await this.raw("POST", path, params.toString(), referer)) as NativePortalResponse;
  }

  /** Detect whether a response body is the login page (i.e. not logged in). */
  isLoginPage(body: string): boolean {
    return /StudentLogin\.do|name="loginform"|captchaId/i.test(body);
  }

  reset(): void {
    this.lastError = null;
  }
}
