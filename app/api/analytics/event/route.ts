import { NextRequest, NextResponse } from "next/server";
import {
  recordAnalyticsEvent,
  ALLOWED_ANALYTICS_EVENTS,
  type AnalyticsEventType,
} from "@/lib/server/analyticsDb";
import {
  getClientIp,
  checkAnalyticsRateLimit,
} from "@/lib/server/analyticsRateLimit";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Forbidden keys that must NEVER be present in analytics payloads
const FORBIDDEN_KEYS = [
  "studentid",
  "student_id",
  "username",
  "password",
  "creds",
  "credentials",
  "attendance",
  "subjects",
  "timetable",
  "session",
  "token",
  "otp",
  "captcha",
  "email",
  "phone",
  "ip",
  "cookie",
];

export async function POST(req: NextRequest) {
  // 1. IP-based rate limiting for abuse prevention
  const clientIp = getClientIp(req);
  const ipLimit = checkAnalyticsRateLimit(`ip:${clientIp}`);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds || 60) } }
    );
  }

  // 2. Parse request payload with safety check
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  // 3. Strict privacy check: Reject any payload containing student/academic/credential fields
  const bodyKeys = Object.keys(body).map((k) => k.toLowerCase());
  for (const forbidden of FORBIDDEN_KEYS) {
    if (bodyKeys.some((k) => k.includes(forbidden))) {
      return NextResponse.json(
        {
          error:
            "Forbidden field detected. Personal credentials, attendance, and student data are strictly forbidden in analytics.",
        },
        { status: 400 }
      );
    }
  }

  // 4. Validate event name
  const rawEvent = typeof body.event === "string" ? body.event.trim().toLowerCase() : "";
  if (!ALLOWED_ANALYTICS_EVENTS.has(rawEvent)) {
    return NextResponse.json(
      { error: "Invalid event type. Only predefined events are accepted." },
      { status: 400 }
    );
  }
  const eventType = rawEvent as AnalyticsEventType;

  // 5. Validate anonymous ID
  const rawAnonymousId = typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";
  if (!rawAnonymousId || !UUID_REGEX.test(rawAnonymousId)) {
    return NextResponse.json(
      { error: "Invalid anonymous identifier. A valid anonymous UUID is required." },
      { status: 400 }
    );
  }

  // 6. Anonymous ID rate limiting for abuse prevention
  const idLimit = checkAnalyticsRateLimit(`id:${rawAnonymousId}`);
  if (!idLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for this client identifier." },
      { status: 429 }
    );
  }

  // 7. Record event in the analytics engine
  try {
    const result = await recordAnalyticsEvent({
      eventType,
      anonymousId: rawAnonymousId,
    });

    return NextResponse.json({
      ok: true,
      deduplicated: result.deduplicated ?? false,
    });
  } catch (error) {
    console.error("[api/analytics/event] Error recording event:", error);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }
}
