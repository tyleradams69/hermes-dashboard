import { NextResponse } from "next/server";

import { createDashboardSession } from "../../../lib/authSession";
import { authenticateSupabaseEmployee } from "../../../lib/supabaseAuth";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const SESSION_TTL_SECONDS = 60 * 60 * 8;

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

function readCredential(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  if (!rateLimitLogin(req)) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts" },
      { status: 429 }
    );
  }

  let body: { email?: unknown; password?: unknown } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid login request" },
      { status: 400 }
    );
  }

  const email = readCredential(body.email).toLowerCase();
  const password = readCredential(body.password);

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  const sessionSecret = process.env.HERMES_DASHBOARD_SESSION_TOKEN;
  if (!sessionSecret) {
    return NextResponse.json(
      { ok: false, error: "Dashboard session token is not configured" },
      { status: 500 }
    );
  }

  let authResult: Awaited<ReturnType<typeof authenticateSupabaseEmployee>>;
  try {
    authResult = await authenticateSupabaseEmployee(email, password);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Supabase auth is not configured" },
      { status: 500 }
    );
  }

  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password" },
      { status: authResult.status === 400 ? 401 : authResult.status }
    );
  }

  const session = await createDashboardSession(authResult.user, sessionSecret, SESSION_TTL_SECONDS);
  const response = NextResponse.json({ ok: true, user: authResult.user });

  response.cookies.set("hermes_dashboard_auth", session, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
