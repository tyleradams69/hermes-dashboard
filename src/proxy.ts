import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isLoggedIn =
    Boolean(process.env.HERMES_DASHBOARD_SESSION_TOKEN) &&
    request.cookies.get("hermes_dashboard_auth")?.value ===
      process.env.HERMES_DASHBOARD_SESSION_TOKEN;

  const isLoginPage = path === "/login";

  const isPublicPath =
    path.startsWith("/api/login") ||
    path.startsWith("/_next") ||
    path.startsWith("/assets") ||
    path === "/favicon.ico";

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
