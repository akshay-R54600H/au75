// ============================================================
// Alliance Portal — low-level HTTP client (server-only)
//
// The AU ERP (Tomcat/mod_jk) tracks sessions two ways:
//   1. Cookie:  JSESSIONID=<id>.tomcat1
//   2. URL rewrite: /auerp/StudentLoginAction.do;jsessionid=<id>.tomcat1
//
// This client keeps a cookie jar AND extracts the jsessionid token
// from HTML so we can re-attach it when cookies are missing.
//
// Runs on Node only (Next.js route handlers / standalone scripts).
// ============================================================

export const PORTAL_ORIGIN = "https://student.alliance.edu.in";
export const PORTAL_BASE = `${PORTAL_ORIGIN}/auerp`;
export const LOGIN_PAGE_URL = `${PORTAL_BASE}/StudentLogin.do`;

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface PortalResponse {
  status: number;
  statusText: string;
  body: string;
  finalUrl: string;
  headers: Record<string, string>;
}

export interface PortalBinaryResponse {
  status: number;
  body: Buffer;
  finalUrl: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface PortalHttpOptions {
  timeoutMs?: number;
  tries?: number;
}

export class PortalHttp {
  private cookies: Record<string, string> = {};
  sessionToken: string | null = null;
  lastError: string | null = null;

  constructor(
    private baseUrl: string = PORTAL_BASE,
    private ua: string = USER_AGENT,
    private opts: PortalHttpOptions = {}
  ) {}

  get hasSession(): boolean {
    return this.sessionToken !== null;
  }

  /** Parse a session token out of a portal URL or HTML (action/href/src). */
  static tokenFromUrl(url: string): string | null {
    const m = url.match(/;jsessionid=([A-Za-z0-9]+\.[A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  /** Find the first jsessionid token anywhere in an HTML body. */
  static tokenFromHtml(html: string): string | null {
    const m = html.match(/;jsessionid=([A-Za-z0-9]+\.[A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  private rememberCookie(name: string, value: string): void {
    this.cookies[name] = value;
    if (name.toLowerCase() === "jsessionid") {
      this.sessionToken = value;
    }
  }

  private parseSetCookie(header: string | string[] | null | undefined): void {
    if (!header) return;
    const lines = Array.isArray(header) ? header : [header];
    for (const line of lines) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      this.rememberCookie(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  private cookieHeader(): string {
    const parts = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`);
    if (this.sessionToken && !this.cookies.JSESSIONID) {
      parts.push(`JSESSIONID=${this.sessionToken}`);
    }
    return parts.join("; ");
  }

  /**
   * Attach ;jsessionid= to a URL ONLY as a cookieless fallback.
   *
   * Once the portal has handed us a JSESSIONID cookie (the normal,
   * browser-like case), the cookie is the single source of truth: mod_jk
   * keeps stickiness through the cookie VALUE's ".tomcatN" suffix.
   * Injecting a token scraped from some page's HTML into a later request
   * pointed the load balancer at whichever node that HTML came from —
   * hopping nodes and dropping the authenticated session mid-sync.
   */
  private withSession(url: string): string {
    if (this.cookies.JSESSIONID) return url;
    if (!this.sessionToken || url.includes(";jsessionid=")) return url;
    const hash = url.indexOf("#");
    const query = url.indexOf("?");
    let cut = url.length;
    if (query !== -1) cut = Math.min(cut, query);
    if (hash !== -1) cut = Math.min(cut, hash);
    return (
      url.slice(0, cut) + `;jsessionid=${this.sessionToken}` + url.slice(cut)
    );
  }

  /**
   * Low-level request with cookie persistence, manual redirect handling
   * and a small retry loop (the portal proxy is flaky — 502s happen).
   */
  private async raw(
    method: "GET" | "POST",
    url: string,
    body?: URLSearchParams,
    referer?: string,
    tries = this.opts.tries ?? 2,
    binary = false
  ): Promise<PortalResponse | PortalBinaryResponse> {
    const timeoutMs = this.opts.timeoutMs ?? 30000;
    const fullUrl = url.startsWith("http")
      ? url
      : url.startsWith("/")
        ? PORTAL_ORIGIN + url
        : this.baseUrl + url;

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "User-Agent": this.ua,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        };
        const cookie = this.cookieHeader();
        if (cookie) headers.Cookie = cookie;
        if (referer) headers.Referer = referer;
        if (body) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          headers["Content-Length"] = String(body.toString().length);
        }

        const res = await fetch(this.withSession(fullUrl), {
          method,
          headers,
          body: method === "POST" ? (body ? body.toString() : undefined) : undefined,
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        });

        const allSetCookie = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
        this.parseSetCookie(allSetCookie);

        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (loc) {
            const next = new URL(loc, fullUrl).toString();
            return this.raw("GET", next, undefined, fullUrl, tries, binary);
          }
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        this.lastError = null;

        if (binary) {
          return {
            status: res.status,
            body: buffer,
            finalUrl: res.url ?? fullUrl,
          };
        }

        const bodyText = /charset=iso-8859-1|charset=latin1/i.test(
          res.headers.get("content-type") ?? ""
        )
          ? buffer.toString("latin1")
          : buffer.toString("utf8");
        // Only adopt a token scraped from the page when the portal never
        // issued a cookie (cookieless mode). When a JSESSIONID cookie
        // exists it is authoritative — see withSession().
        if (!this.cookies.JSESSIONID) {
          const token =
            PortalHttp.tokenFromUrl(res.url ?? fullUrl) ??
            PortalHttp.tokenFromHtml(bodyText);
          if (token) this.sessionToken = token;
        }

        return {
          status: res.status,
          statusText: res.statusText,
          body: bodyText,
          finalUrl: res.url ?? fullUrl,
          headers: {},
        };
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        if (attempt === tries) {
          throw new Error(
            `[PortalHttp] request failed after ${tries} tries: ${this.lastError}`
          );
        }
        await sleep(800 * attempt);
      }
    }
    throw new Error("[PortalHttp] unreachable");
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  async get(path: string, referer?: string): Promise<PortalResponse> {
    const res = await this.raw("GET", this.withSession(path), undefined, referer);
    return res as PortalResponse;
  }

  /** Fetch raw bytes (CAPTCHA images etc.) without corrupting them. */
  async getBinary(path: string, referer?: string): Promise<PortalBinaryResponse> {
    const res = await this.raw("GET", this.withSession(path), undefined, referer, undefined, true);
    return res as PortalBinaryResponse;
  }

  async postForm(
    path: string,
    fields: Record<string, string>,
    referer?: string
  ): Promise<PortalResponse> {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    const res = await this.raw("POST", this.withSession(path), body, referer);
    return res as PortalResponse;
  }

  /** Detect whether a response body is the login page (i.e. not logged in). */
  isLoginPage(body: string): boolean {
    return /StudentLogin\.do|name="loginform"|captchaId/i.test(body);
  }

  getCookies(): Record<string, string> {
    return { ...this.cookies };
  }

  /** Rebuild a client from a sealed session (see sessionToken.ts). */
  static restore(
    cookies: Record<string, string>,
    sessionToken: string | null,
    opts: PortalHttpOptions
  ): PortalHttp {
    const c = new PortalHttp(PORTAL_BASE, undefined, opts);
    c.cookies = { ...cookies };
    c.sessionToken = sessionToken;
    return c;
  }

  reset(): void {
    this.cookies = {};
    this.sessionToken = null;
    this.lastError = null;
  }
}

/** Small io helper re-exported for scripts. */
export { sleep };