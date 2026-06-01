import { NextRequest, NextResponse } from "next/server";

import { createDashboardSession, verifyDashboardSession } from "../../../lib/authSession";
import { readServerEnv } from "../../../lib/env";
import { updateSupabaseEmployee } from "../../../lib/supabaseAuth";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

async function getSession(request: NextRequest) {
  return verifyDashboardSession(
    request.cookies.get("hermes_dashboard_auth")?.value,
    readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN")
  );
}

function accountJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return accountJson({ ok: false, error: "Not authenticated" }, 401);
  }

  return accountJson({ ok: true, user: session });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return accountJson({ ok: false, error: "Not authenticated" }, 401);
  }

  let body: { name?: unknown; password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return accountJson({ ok: false, error: "Invalid account update request" }, 400);
  }

  const updates: { name?: string; password?: string } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return accountJson({ ok: false, error: "Name must be text" }, 400);
    }

    const name = body.name.trim();
    if (!name) {
      return accountJson({ ok: false, error: "Name is required" }, 400);
    }

    updates.name = name;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string") {
      return accountJson({ ok: false, error: "Password must be text" }, 400);
    }

    if (body.password.length < 8) {
      return accountJson({ ok: false, error: "Password must be at least 8 characters" }, 400);
    }

    updates.password = body.password;
  }

  if (!updates.name && !updates.password) {
    return accountJson({ ok: false, error: "No account updates provided" }, 400);
  }

  let updateResult: Awaited<ReturnType<typeof updateSupabaseEmployee>>;
  try {
    updateResult = await updateSupabaseEmployee(session.id, updates.name ? { ...updates, role: session.role === "admin" ? "admin" : "employee" } : updates);
  } catch {
    return accountJson({ ok: false, error: "Supabase admin auth is not configured" }, 500);
  }

  if (!updateResult.ok) {
    return accountJson({ ok: false, error: updateResult.error }, updateResult.status);
  }

  const response = accountJson({ ok: true, user: updateResult.user });
  const sessionSecret = readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN");

  if (sessionSecret) {
    const nextSession = await createDashboardSession(updateResult.user, sessionSecret, SESSION_TTL_SECONDS);
    response.cookies.set("hermes_dashboard_auth", nextSession, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  return response;
}
