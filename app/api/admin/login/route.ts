import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminCredentials,
  setAdminSessionCookie,
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
} from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown-ip";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkLoginRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds || 60),
        },
      }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim() || "";
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const isValid = verifyAdminCredentials(email, password);

  if (!isValid) {
    recordFailedLogin(ip);
    return NextResponse.json(
      { error: "Invalid administrator email or password." },
      { status: 401 }
    );
  }

  // Login successful
  resetFailedLogin(ip);

  const res = NextResponse.json({
    ok: true,
    email: email.toLowerCase(),
    message: "Admin session authenticated successfully.",
  });

  setAdminSessionCookie(res, email);

  return res;
}
