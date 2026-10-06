import { NextRequest, NextResponse } from "next/server";
import { getPresentDayTimetable, REAL_SESSIONS } from "@/lib/portal/realTimetable";
import { getWebPushInstance } from "@/lib/server/pushConfig";
import {
  getAllPushSubscriptions,
  savePushSubscription,
  syncScheduledAlerts,
  type PushSubscriptionDTO,
} from "@/lib/server/pushDb";
import { generateSchedule } from "@/lib/notifications/scheduler";
import { DEFAULT_NOTIFICATION_OFFSET_MINUTES } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/present-timetable
 * Returns today's actual student timetable and notification status.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") || undefined;
    const timetable = getPresentDayTimetable(dateParam);
    const subscriptions = await getAllPushSubscriptions();

    return NextResponse.json({
      ok: true,
      ...timetable,
      activePushSubscribers: subscriptions.length,
    });
  } catch (err: unknown) {
    console.error("[present-timetable] Error retrieving timetable:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portal/present-timetable
 * Dispatches notifications for today's real class to all registered devices
 * and synchronizes today's real schedule into the background Web Push worker.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { subscription?: PushSubscriptionDTO; classId?: string } = {};
    try {
      body = await req.json();
    } catch {}

    const timetable = getPresentDayTimetable();
    const targetClass =
      (body.classId ? timetable.classes.find((c) => c.id === body.classId) : null) ||
      timetable.activeOrNext ||
      timetable.classes[2]; // Default to slot 4: Leadership and Management Skills (11:00 AM)

    const wp = getWebPushInstance();
    const subsToNotify: PushSubscriptionDTO[] = [];

    // ONLY notify the requesting subscription, never broadcast or overwrite other users' schedules!
    if (body.subscription?.endpoint) {
      await savePushSubscription(body.subscription);
      subsToNotify.push(body.subscription);
    }

    // Compose notification payload strictly with real class info
    const notifTitle = `🔔 ${targetClass.name}`;
    const nextClass = timetable.classes.find((c) => c.slot > targetClass.slot);
    const nextInfo = nextClass ? ` Next: ${nextClass.name} in ${nextClass.room} (${nextClass.startTime}).` : "";
    const notifBody = `${targetClass.name} in ${targetClass.room} (${targetClass.time}).${nextInfo}`;

    const payload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      tag: `au75-real-class-${targetClass.id}`,
      data: {
        url: "/calendar",
        classDate: timetable.date,
        startTime: targetClass.startTime,
        venue: targetClass.room,
        subjectName: targetClass.name,
      },
    });

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subsToNotify) {
      try {
        await wp.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
        sentCount++;
      } catch (err: unknown) {
        errors.push(`${sub.endpoint.slice(-10)}: ${(err as Error)?.message || "Failed"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Notifications for today's present class dispatched successfully.",
      notificationSent: {
        title: notifTitle,
        body: notifBody,
        venue: targetClass.room,
        time: targetClass.time,
        class: targetClass.name,
      },
      todayTimetable: timetable.classes,
      subscribersCount: subsToNotify.length,
      sentCount,
      errors: errors.slice(0, 3),
    });
  } catch (err: unknown) {
    console.error("[present-timetable] Error sending notification:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}
