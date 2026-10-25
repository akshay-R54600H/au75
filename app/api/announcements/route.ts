import { NextResponse } from "next/server";
import { listActiveAnnouncements } from "@/lib/server/announcementsDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public: enabled, unexpired announcements for the dashboard carousel. */
export async function GET() {
  try {
    const announcements = await listActiveAnnouncements();
    return NextResponse.json(
      {
        announcements: announcements.map(({ id, title, message, type, icon, expiresAt }) => ({
          id,
          title,
          message,
          type,
          icon,
          expiresAt,
        })),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[api/announcements] Error fetching announcements:", error);
    // Non-2xx so clients keep showing their last known list.
    return NextResponse.json(
      { error: "Unable to load announcements." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
