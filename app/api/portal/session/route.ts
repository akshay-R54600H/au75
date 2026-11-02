import { NextRequest, NextResponse } from "next/server";
import { createLoginSession } from "@/lib/server/portalSessions";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const result = await createLoginSession();
  console.log(`[portal/session] ${Date.now() - t0}ms ${result.ok ? "ok" : result.reason}`);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status: 502 }
    );
  }
  return NextResponse.json(result);
}