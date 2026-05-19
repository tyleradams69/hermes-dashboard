import * as crypto from "crypto";
import { NextResponse } from "next/server";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0].trim() || "unknown";
}

function rateLimitLogin(req: Request) {
  const now = Date.now();
  const key = getClientKey(req);
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + 15 * 60 * 1000,
    });

    return true;
  }

  if (current.count >= 5) {
    return false;
  }

  current.count += 1;
  return true;
}

function safeEqual(value: string, expected: string) {
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function validPassword(password: unknown) {
  if (typeof password !== "string") {
    return false;
  }

  const allowedPasswords = [
    process.env.TYLER_DASHBOARD_PASSWORD,
    process.env.JACK_DASHBOARD_PASSWORD,
  ].filter((value): value is string => Boolean(value));

  if (allowedPasswords.length === 0) {
    throw new Error("Dashboard password is not configured");
  }

  return allowedPasswords.some((allowedPassword) =>
    safeEqual(password, allowedPassword)
  );
}

export async function POST(req: Request) {
  if (!rateLimitLogin(req)) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts" },
      { status: 429 }
    );
  }

  let body: { password?: unknown } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid login request" },
      { status: 400 }
    );
  }

  let authenticated = false;

  try {
    authenticated = validPassword(body.password);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dashboard password is not configured" },
      { status: 500 }
    );
  }

  if (!authenticated) {
    return NextResponse.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }

  const sessionToken = process.env.HERMES_DASHBOARD_SESSION_TOKEN;

  if (!sessionToken) {
    return NextResponse.json(
      { ok: false, error: "Dashboard session token is not configured" },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("hermes_dashboard_auth", sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
