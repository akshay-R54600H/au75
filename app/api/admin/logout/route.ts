import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out successfully." });
  clearAdminSessionCookie(res);
  return res;
}
