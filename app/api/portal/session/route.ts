import { NextRequest, NextResponse } from "next/server";
import { createLoginSession } from "@/lib/server/portalSessions";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
// Run next to the portal (India); from the default US region (iad1)
// every portal request failed with "fetch failed".
export const preferredRegion = "bom1";

export async function POST(req: NextRequest) {
  const result = await createLoginSession();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status: 502 }
    );
  }
  return NextResponse.json(result);
}