import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = "Henry2026";
const COOKIE_NAME = "clawdbot-auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow these paths without auth
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);

  if (authCookie?.value === PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
