import { NextResponse } from "next/server";
import * as crypto from "crypto";

import { createDashboardSession } from "../../../lib/authSession";
import { readServerEnv } from "../../../lib/env";
import { authenticateSupabaseEmployee, type SupabaseAuthUser } from "../../../lib/supabaseAuth";

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

function safeEqual(value: string, expected: string) {
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function authenticateConfiguredEmployeePassword(email: string, password: string): SupabaseAuthUser | null {
  const configuredEmployees = [
    {
      id: "tyler",
      email: email || "tyler@liminull.com",
      name: "Tyler",
      role: "admin",
      password: readServerEnv("TYLER_DASHBOARD_PASSWORD"),
    },
    {
      id: "jack",
      email: email || "jack@liminull.com",
      name: "Jack",
      role: "employee",
      password: readServerEnv("JACK_DASHBOARD_PASSWORD"),
    },
  ].filter((employee) => employee.password);

  const matchingEmployee = configuredEmployees.find((employee) =>
    safeEqual(password, employee.password)
  );

  if (!matchingEmployee) {
    return null;
  }

  return {
    id: `env-${matchingEmployee.id}`,
    email,
    name: matchingEmployee.name,
    role: matchingEmployee.role,
  };
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

  const sessionSecret = readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN");
  if (!sessionSecret) {
    return NextResponse.json(
      { ok: false, error: "Dashboard session token is not configured" },
      { status: 500 }
    );
  }

  let authResult: Awaited<ReturnType<typeof authenticateSupabaseEmployee>>;
  try {
    authResult = await authenticateSupabaseEmployee(email, password);
  } catch (error) {
    const fallbackUser = authenticateConfiguredEmployeePassword(email, password);
    if (fallbackUser) {
      authResult = { ok: true, user: fallbackUser };
    } else {
      const isConfigError = error instanceof Error && error.message === "Supabase auth is not configured";
      return NextResponse.json(
        { ok: false, error: isConfigError ? "Supabase auth is not configured" : "Unable to reach Supabase auth" },
        { status: isConfigError ? 500 : 502 }
      );
    }
  }

  if (!authResult.ok) {
    const fallbackUser = authenticateConfiguredEmployeePassword(email, password);
    if (fallbackUser) {
      authResult = { ok: true, user: fallbackUser };
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: authResult.status === 400 ? 401 : authResult.status }
      );
    }
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
