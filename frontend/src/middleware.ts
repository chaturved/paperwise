import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedRoute, matchesRoute } from "@/lib/auth-routes";

const AUTH_ONLY_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("paperwise_access_token")?.value;

  const isProtected = isProtectedRoute(pathname);
  const isAuthOnly = AUTH_ONLY_PATHS.some((route) => matchesRoute(pathname, route));

  if (!token && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
