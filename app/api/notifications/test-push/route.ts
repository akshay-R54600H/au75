import { NextRequest, NextResponse } from "next/server";
import { getWebPushInstance } from "@/lib/server/pushConfig";
import type { PushSubscriptionDTO } from "@/lib/server/pushDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subscription = body.subscription as PushSubscriptionDTO | undefined;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
    }

    const wp = getWebPushInstance();
    const payload = JSON.stringify({
      title: "🔔 AU75 Notifications",
      body: "Automatic background class notifications are active and working!",
      tag: "au75-test-push",
      data: { url: "/calendar" },
    });

    await wp.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[test-push] Error dispatching test push notification:", err);
    const statusCode = (err as { statusCode?: number })?.statusCode || 500;
    const message = (err as Error)?.message || "Failed to deliver test push notification";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
