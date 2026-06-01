import { NextRequest, NextResponse } from "next/server";

import { verifyDashboardSession } from "../../../lib/authSession";
import { readServerEnv } from "../../../lib/env";
import { listSupabaseEmployees } from "../../../lib/supabaseAuth";

export const dynamic = "force-dynamic";

async function getSession(request: NextRequest) {
  return verifyDashboardSession(
    request.cookies.get("hermes_dashboard_auth")?.value,
    readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN")
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 });
  }

  let result: Awaited<ReturnType<typeof listSupabaseEmployees>>;
  try {
    result = await listSupabaseEmployees();
  } catch {
    return NextResponse.json({ ok: false, error: "Supabase admin auth is not configured" }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, employees: result.employees });
}
