import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/server/adminAuth";
import {
  getMaintenanceConfig,
  updateMaintenanceConfig,
  isSupabaseConfigured,
} from "@/lib/server/maintenanceDb";

export const dynamic = "force-dynamic";

/** GET current maintenance configuration with server diagnostic info (admin only). */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  try {
    const config = await getMaintenanceConfig(true);
    return NextResponse.json(
      {
        ...config,
        isSupabaseConnected: isSupabaseConfigured(),
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[api/admin/maintenance] GET error:", error);
    return NextResponse.json({ error: "Failed to retrieve maintenance configuration." }, { status: 500 });
  }
}

/** POST or PATCH maintenance configuration (admin only). */
async function handleUpdate(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  let body: { maintenanceMode?: boolean; title?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const updated = await updateMaintenanceConfig({
      maintenanceMode: typeof body.maintenanceMode === "boolean" ? body.maintenanceMode : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
      updatedBy: session.email,
    });

    return NextResponse.json({
      ok: true,
      data: updated,
      message: updated.maintenanceMode
        ? "AU75 has been placed into maintenance mode."
        : "AU75 is now LIVE.",
    });
  } catch (error) {
    console.error("[api/admin/maintenance] Update error:", error);
    return NextResponse.json(
      { error: "Unable to update maintenance status. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}
