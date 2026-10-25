import { NextResponse, type NextRequest } from "next/server";

// Only the admin APIs need a gate here; every other route (pages, assets,
// public APIs) passes straight through, so the matcher below limits the
// middleware to /api/admin/* and avoids an edge invocation on every request.
// App routes are guarded by MaintenanceGuard on the client.

/** Admin endpoints reachable without a session cookie. */
const PUBLIC_ADMIN_PATHS = new Set(["/api/admin/login", "/api/admin/session", "/api/admin/logout"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Protected admin APIs (e.g. POST/PATCH /api/admin/maintenance): require the
  // admin session cookie to be present. The route handler performs the
  // cryptographic verification.
  const adminCookie = request.cookies.get("au75_admin_session");
  if (!adminCookie?.value) {
    return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
