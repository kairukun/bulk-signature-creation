import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/signature") return true;
  if (pathname === "/login") return true;
  if (pathname === "/api/auth/login") return true;
  if (pathname === "/api/findmi/directory") return true;
  if (pathname.startsWith("/api/track/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // Already signed in → skip login form
    if (pathname === "/login") {
      const session = verifySessionToken(
        request.cookies.get(SESSION_COOKIE)?.value,
      );
      if (session) {
        return NextResponse.redirect(new URL("/app", request.url));
      }
    }
    return NextResponse.next();
  }

  const session = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Sign in required." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
