import { NextRequest, NextResponse } from "next/server";
import { getWebPushInstance } from "@/lib/server/pushConfig";
import {
  getDueAlerts,
  markAlertsDelivered,
  removePushSubscription,
  cleanupDeliveredAlerts,
} from "@/lib/server/pushDb";

export const dynamic = "force-dynamic";

async function handleDispatch(req: NextRequest) {
  // Optional security: if CRON_SECRET is configured, require Authorization header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const wp = getWebPushInstance();
  const dueItems = await getDueAlerts();

  const deliveredIds: string[] = [];
  const expiredEndpoints = new Set<string>();
  const errors: string[] = [];

  for (const { alert, subscription } of dueItems) {
    // If endpoint already failed as expired in this loop, skip
    if (expiredEndpoints.has(subscription.endpoint)) {
      continue;
    }

    const payload = JSON.stringify({
      title: alert.title || "🔔 Upcoming Class",
      body: alert.body,
      tag: alert.tag || alert.id,
      data: {
        url: "/calendar",
        classDate: alert.classDate,
        startTime: alert.formattedTime,
        venue: alert.venue,
      },
    });

    try {
      await wp.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        payload
      );
      deliveredIds.push(alert.id);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription is no longer valid; user unsubscribed or removed permissions
        expiredEndpoints.add(subscription.endpoint);
        await removePushSubscription(subscription.endpoint);
      } else {
        errors.push(`${alert.id}: ${(err as Error)?.message || "Unknown error"}`);
      }
    }
  }

  // Mark all successfully delivered alerts
  if (deliveredIds.length > 0) {
    await markAlertsDelivered(deliveredIds);
  }

  // Clean up alerts delivered over 24 hours ago
  const cleanedCount = await cleanupDeliveredAlerts();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    dueCount: dueItems.length,
    deliveredCount: deliveredIds.length,
    expiredRemoved: expiredEndpoints.size,
    cleanedCount,
    errors: errors.slice(0, 5),
  });
}

export async function GET(req: NextRequest) {
  return handleDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleDispatch(req);
}
