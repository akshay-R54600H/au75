import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/server/adminAuth";
import {
  AnnouncementValidationError,
  createAnnouncement,
  listAnnouncements,
  type AnnouncementInput,
} from "@/lib/server/announcementsDb";

export const dynamic = "force-dynamic";

/** GET every announcement, including disabled and expired ones (admin only). */
export async function GET(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  try {
    const announcements = await listAnnouncements(true);
    return NextResponse.json({ announcements }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[api/admin/announcements] GET error:", error);
    return NextResponse.json({ error: "Failed to load announcements." }, { status: 500 });
  }
}

/** POST a new announcement (admin only). */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  let body: AnnouncementInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const created = await createAnnouncement(body, session.email);
    return NextResponse.json({ ok: true, data: created });
  } catch (error) {
    if (error instanceof AnnouncementValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/admin/announcements] POST error:", error);
    return NextResponse.json({ error: "Unable to save announcement. Please try again." }, { status: 500 });
  }
}
