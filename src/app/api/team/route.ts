import { NextRequest, NextResponse } from "next/server";

import { verifyDashboardSession } from "../../../lib/authSession";
import { readServerEnv } from "../../../lib/env";
import { createSupabaseEmployee, listSupabaseTeamAccounts, updateSupabaseEmployee } from "../../../lib/supabaseAuth";

export const dynamic = "force-dynamic";

type TeamPatchBody = {
  id?: unknown;
  name?: unknown;
  role?: unknown;
  password?: unknown;
};

type TeamCreateBody = {
  email?: unknown;
  name?: unknown;
  role?: unknown;
  password?: unknown;
};

async function getSession(request: NextRequest) {
  return verifyDashboardSession(
    request.cookies.get("hermes_dashboard_auth")?.value,
    readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN")
  );
}

function teamJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function isDashboardRole(value: unknown): value is "admin" | "employee" {
  return value === "admin" || value === "employee";
}

async function requireAdmin(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return { session: null, response: teamJson({ ok: false, error: "Not authenticated" }, 401) };
  }

  if (session.role !== "admin") {
    return { session, response: teamJson({ ok: false, error: "Admin access required" }, 403) };
  }

  return { session, response: null };
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let result: Awaited<ReturnType<typeof listSupabaseTeamAccounts>>;
  try {
    result = await listSupabaseTeamAccounts();
  } catch {
    return teamJson({ ok: false, error: "Supabase admin auth is not configured" }, 500);
  }

  if (!result.ok) {
    return teamJson({ ok: false, error: result.error }, result.status);
  }

  return teamJson({ ok: true, accounts: result.accounts });
}


export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let body: TeamCreateBody = {};
  try {
    body = await request.json();
  } catch {
    return teamJson({ ok: false, error: "Invalid team create request" }, 400);
  }

  if (typeof body.email !== "string" || !body.email.trim() || !body.email.includes("@")) {
    return teamJson({ ok: false, error: "Valid email is required" }, 400);
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return teamJson({ ok: false, error: "Name is required" }, 400);
  }

  if (!isDashboardRole(body.role)) {
    return teamJson({ ok: false, error: "Role must be admin or employee" }, 400);
  }

  if (typeof body.password !== "string" || body.password.length < 8) {
    return teamJson({ ok: false, error: "Password must be at least 8 characters" }, 400);
  }

  let result: Awaited<ReturnType<typeof createSupabaseEmployee>>;
  try {
    result = await createSupabaseEmployee({
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      role: body.role,
      password: body.password,
    });
  } catch {
    return teamJson({ ok: false, error: "Supabase admin auth is not configured" }, 500);
  }

  if (!result.ok) {
    return teamJson({ ok: false, error: result.error }, result.status);
  }

  return teamJson({ ok: true, account: result.user }, 201);
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  let body: TeamPatchBody = {};
  try {
    body = await request.json();
  } catch {
    return teamJson({ ok: false, error: "Invalid team update request" }, 400);
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return teamJson({ ok: false, error: "User id is required" }, 400);
  }

  const updates: { name?: string; password?: string; role?: "admin" | "employee" } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return teamJson({ ok: false, error: "Name must be text" }, 400);
    }

    const name = body.name.trim();
    if (!name) {
      return teamJson({ ok: false, error: "Name is required" }, 400);
    }

    updates.name = name;
  }

  if (body.role !== undefined) {
    if (!isDashboardRole(body.role)) {
      return teamJson({ ok: false, error: "Role must be admin or employee" }, 400);
    }

    if (session?.id === body.id && body.role !== "admin") {
      return teamJson({ ok: false, error: "You cannot remove your own admin role" }, 400);
    }

    updates.role = body.role;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string") {
      return teamJson({ ok: false, error: "Password must be text" }, 400);
    }

    if (body.password.length < 8) {
      return teamJson({ ok: false, error: "Password must be at least 8 characters" }, 400);
    }

    updates.password = body.password;
  }

  if (!updates.name && !updates.role && !updates.password) {
    return teamJson({ ok: false, error: "No team updates provided" }, 400);
  }

  let result: Awaited<ReturnType<typeof updateSupabaseEmployee>>;
  try {
    result = await updateSupabaseEmployee(body.id.trim(), updates);
  } catch {
    return teamJson({ ok: false, error: "Supabase admin auth is not configured" }, 500);
  }

  if (!result.ok) {
    return teamJson({ ok: false, error: result.error }, result.status);
  }

  return teamJson({ ok: true, account: result.user });
}
