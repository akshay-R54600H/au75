import { NextRequest, NextResponse } from "next/server";
import { submitLogin } from "@/lib/server/portalSessions";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; studentId?: string; password?: string; captcha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();
  const studentId = body.studentId?.trim();
  const password = body.password;
  const captcha = body.captcha?.trim();

  if (!token || !studentId || !password || !captcha) {
    return NextResponse.json(
      { error: "token, studentId, password and captcha are required." },
      { status: 400 }
    );
  }

  const t0 = Date.now();
  const result = await submitLogin(token, studentId, password, captcha);
  console.log(`[portal/start] ${Date.now() - t0}ms ${result.step}`);
  if (result.step === "failed") {
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status: 401 }
    );
  }
  return NextResponse.json(result);
}