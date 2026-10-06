import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/server/pushDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body.endpoint;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Missing subscription endpoint." }, { status: 400 });
    }

    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[unsubscribe] Error removing push subscription:", err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
