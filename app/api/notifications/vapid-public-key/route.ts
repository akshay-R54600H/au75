import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/server/pushConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = getVapidKeys();
    return NextResponse.json(
      { publicKey: keys.publicKey },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (err) {
    console.error("[vapid-public-key] Failed to load keys:", err);
    return NextResponse.json({ error: "Failed to load VAPID key" }, { status: 500 });
  }
}
