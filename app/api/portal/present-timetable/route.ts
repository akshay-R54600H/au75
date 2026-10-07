import { NextRequest, NextResponse } from "next/server";
import { getPresentDayTimetable } from "@/lib/portal/realTimetable";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/present-timetable
 * Returns today's actual student timetable.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") || undefined;
    const timetable = getPresentDayTimetable(dateParam);

    return NextResponse.json({
      ok: true,
      ...timetable,
    });
  } catch (err: unknown) {
    console.error("[present-timetable] Error retrieving timetable:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}
