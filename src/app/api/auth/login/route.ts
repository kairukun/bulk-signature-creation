import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  credentialsConfigured,
  sessionCookieOptions,
  verifyLoginCredentials,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!credentialsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Login is not configured. Set AUTH_EMAIL, AUTH_PASSWORD, and AUTH_SECRET on the host.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");

  if (!verifyLoginCredentials(email, password)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = createSessionToken(email.trim().toLowerCase());
  const response = NextResponse.json({
    ok: true,
    email: email.trim().toLowerCase(),
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
