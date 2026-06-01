import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, PATCH } from "../src/app/api/team/route";
import { createDashboardSession } from "../src/lib/authSession";

function request(url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url, init);
}

async function authCookie(user = { id: "admin-1", email: "tyler@liminull.com", name: "Tyler", role: "admin" }) {
  const session = await createDashboardSession(user, "session-signing-secret", 60 * 60 * 8);
  return `hermes_dashboard_auth=${session}`;
}

describe("team API", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-signing-secret";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets admins list all authenticated team accounts with roles", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: [
            { id: "employee-1", email: "jacob@example.com", confirmed_at: "2026-06-01T00:00:00Z", user_metadata: { full_name: "Jacob", role: "employee" } },
            { id: "admin-2", email: "jack@example.com", email_confirmed_at: "2026-06-01T00:00:00Z", user_metadata: { full_name: "Jack", role: "admin" } },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const response = await GET(request("https://dashboard.example.com/api/team", { headers: { cookie: await authCookie() } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      accounts: [
        { id: "admin-2", email: "jack@example.com", name: "Jack", role: "admin", emailConfirmed: true },
        { id: "employee-1", email: "jacob@example.com", name: "Jacob", role: "employee", emailConfirmed: true },
      ],
    });
  });

  it("lets admins update a user name, role, and temporary password", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "employee-1", email: "jacob@example.com", user_metadata: { full_name: "Jacob", role: "admin" } }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const response = await PATCH(
      request("https://dashboard.example.com/api/team", {
        method: "PATCH",
        headers: { cookie: await authCookie(), "content-type": "application/json" },
        body: JSON.stringify({ id: "employee-1", name: "Jacob", role: "admin", password: "Liminull-temp-25!" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, account: { id: "employee-1", email: "jacob@example.com", name: "Jacob", role: "admin" } });
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/admin/users/employee-1",
      expect.objectContaining({
        method: "PUT",
        cache: "no-store",
        body: JSON.stringify({ user_metadata: { full_name: "Jacob", name: "Jacob", role: "admin" }, password: "Liminull-temp-25!" }),
      })
    );
  });

  it("blocks employees and self-demotion from team management", async () => {
    const employeeResponse = await GET(
      request("https://dashboard.example.com/api/team", {
        headers: { cookie: await authCookie({ id: "employee-1", email: "employee@liminull.com", name: "Employee", role: "employee" }) },
      })
    );

    expect(employeeResponse.status).toBe(403);

    const selfDemoteResponse = await PATCH(
      request("https://dashboard.example.com/api/team", {
        method: "PATCH",
        headers: { cookie: await authCookie(), "content-type": "application/json" },
        body: JSON.stringify({ id: "admin-1", role: "employee" }),
      })
    );

    expect(selfDemoteResponse.status).toBe(400);
    expect(await selfDemoteResponse.json()).toEqual({ ok: false, error: "You cannot remove your own admin role" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
