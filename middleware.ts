import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static files, Next.js internal files, manifest, sw, icons
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/apple-icon.png" ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Allow public maintenance and admin login/session endpoints
  if (
    pathname === "/api/maintenance" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/session" ||
    pathname === "/api/admin/logout" ||
    pathname.startsWith("/api/portal")
  ) {
    return NextResponse.next();
  }

  // 3. For protected admin mutation APIs (like POST/PATCH /api/admin/maintenance)
  // Ensure the admin session cookie is at least present (the route handler performs cryptographic verification)
  if (pathname.startsWith("/api/admin")) {
    const adminCookie = request.cookies.get("au75_admin_session");
    if (!adminCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }
  }

  // 4. /admin route is handled by the admin client page (renders login or dashboard)
  // and all standard app routes are allowed through to be guarded by MaintenanceGuard
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
