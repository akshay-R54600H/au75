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
    // If an unexpected error occurs, do NOT force maintenance mode; return false
    return NextResponse.json(
      {
        maintenanceMode: false,
        title: "AU75 is under maintenance",
        message: "We're making a few improvements. Please check back soon.",
        updatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
