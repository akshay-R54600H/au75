import { NextRequest, NextResponse } from "next/server";
import { completeOtp } from "@/lib/server/portalSessions";


export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();
  const otp = body.otp?.trim();

  if (!token || !otp) {
    return NextResponse.json(
      { error: "token and otp are required." },
      { status: 400 }
    );
  }

  const result = await completeOtp(token, otp);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }
  return NextResponse.json({ ok: true, data: result.data });
}
