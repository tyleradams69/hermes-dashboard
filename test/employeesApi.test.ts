import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "../src/app/api/employees/route";
import { createDashboardSession } from "../src/lib/authSession";

function request(url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url, init);
}

async function authCookie(user = { id: "admin-1", email: "tyler@liminull.com", name: "Tyler", role: "admin" }) {
  const session = await createDashboardSession(user, "session-signing-secret", 60 * 60 * 8);
  return `hermes_dashboard_auth=${session}`;
}

describe("employees API", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-signing-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            users: [
              {
                id: "user-logan",
                email: "loganm40@outlook.com",
                email_confirmed_at: "2026-05-31T00:00:00Z",
                user_metadata: { full_name: "Logan", role: "employee" },
                app_metadata: { role: "employee" },
              },
              {
                id: "user-admin",
                email: "admin@liminull.com",
                email_confirmed_at: "2026-05-31T00:00:00Z",
                user_metadata: { full_name: "Tyler", role: "admin" },
                app_metadata: { role: "admin" },
              },
              {
                id: "user-daniel",
                email: "ludicent520@gmail.com",
                confirmed_at: "2026-05-31T00:00:00Z",
                user_metadata: { full_name: "Daniel", role: "employee" },
                app_metadata: { role: "employee" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets admins list employee auth accounts sorted by name", async () => {
    const response = await GET(
      request("https://dashboard.example.com/api/employees", {
        headers: { cookie: await authCookie() },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      employees: [
        {
          id: "user-daniel",
          email: "ludicent520@gmail.com",
          name: "Daniel",
          role: "employee",
          emailConfirmed: true,
        },
        {
          id: "user-logan",
          email: "loganm40@outlook.com",
          name: "Logan",
          role: "employee",
          emailConfirmed: true,
        },
      ],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/admin/users?per_page=1000",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
  });

  it("blocks non-admin employee directory access", async () => {
    const response = await GET(
      request("https://dashboard.example.com/api/employees", {
        headers: { cookie: await authCookie({ id: "user-employee", email: "employee@liminull.com", name: "Employee", role: "employee" }) },
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Admin access required" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
