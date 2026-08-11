import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "dpm_sig_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionPayload = {
  email: string;
  exp: number;
};

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  // Dev-only fallback so local `next dev` works before env is set.
  if (process.env.NODE_ENV !== "production") {
    return "dpm-dev-auth-secret-change-me";
  }
  throw new Error("AUTH_SECRET is not configured");
}

export function getExpectedCredentials(): { email: string; password: string } {
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error("AUTH_EMAIL and AUTH_PASSWORD must be configured");
  }
  return { email, password };
}

export function credentialsConfigured(): boolean {
  return Boolean(
    process.env.AUTH_EMAIL?.trim() && process.env.AUTH_PASSWORD != null && process.env.AUTH_PASSWORD !== "",
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadPart: string): string {
  return createHmac("sha256", authSecret()).update(payloadPart).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function createSessionToken(email: string): string {
  const payload: SessionPayload = {
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadPart);
  return `${payloadPart}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  const expected = sign(payloadPart);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as SessionPayload;
    if (!payload?.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyLoginCredentials(email: string, password: string): boolean {
  if (!credentialsConfigured()) return false;
  const expected = getExpectedCredentials();
  const emailOk = safeEqual(email.trim().toLowerCase(), expected.email);
  const passwordOk = safeEqual(password, expected.password);
  return emailOk && passwordOk;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
