import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/server/adminAuth";
import {
  AnnouncementNotFoundError,
  AnnouncementValidationError,
  deleteAnnouncement,
  updateAnnouncement,
  type AnnouncementInput,
} from "@/lib/server/announcementsDb";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

/** PATCH an announcement: edit fields or enable/disable it (admin only). */
export async function PATCH(req: NextRequest, { params }: Params) {
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
    const updated = await updateAnnouncement(params.id, body, session.email);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof AnnouncementValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AnnouncementNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[api/admin/announcements] PATCH error:", error);
    return NextResponse.json({ error: "Unable to update announcement. Please try again." }, { status: 500 });
  }
}

/** DELETE an announcement (admin only). */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  try {
    await deleteAnnouncement(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AnnouncementNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[api/admin/announcements] DELETE error:", error);
    return NextResponse.json({ error: "Unable to delete announcement. Please try again." }, { status: 500 });
  }
}
