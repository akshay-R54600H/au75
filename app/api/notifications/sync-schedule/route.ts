import { NextRequest, NextResponse } from "next/server";
import {
  savePushSubscription,
  syncScheduledAlerts,
  type PushSubscriptionDTO,
} from "@/lib/server/pushDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subscription = body.subscription as PushSubscriptionDTO | undefined;
    const alerts = body.alerts;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid or missing push subscription." },
        { status: 400 }
      );
    }

    if (!Array.isArray(alerts)) {
      return NextResponse.json(
        { error: "Alerts must be an array." },
        { status: 400 }
      );
    }

    // 1. Save subscription
    await savePushSubscription(subscription);

    // 2. Synchronize schedule
    const result = await syncScheduledAlerts(subscription.endpoint, alerts);

    return NextResponse.json({ ok: true, synced: result.synced });
  } catch (err) {
    console.error("[sync-schedule] Error syncing notification schedule:", err);
    return NextResponse.json(
      { error: "Failed to sync notification schedule" },
      { status: 500 }
    );
  }
}
