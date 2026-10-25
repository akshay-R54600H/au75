import { NextResponse } from "next/server";
import { getMaintenanceConfig } from "@/lib/server/maintenanceDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getMaintenanceConfig();
    return NextResponse.json(
      {
        maintenanceMode: config.maintenanceMode,
        title: config.title,
        message: config.message,
        updatedAt: config.updatedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("[api/maintenance] Error fetching maintenance status:", error);
    // Don't report a made-up `false` — that would silently switch maintenance off.
    // A non-2xx makes clients keep their last known state.
    return NextResponse.json(
      { error: "Unable to determine maintenance status." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
