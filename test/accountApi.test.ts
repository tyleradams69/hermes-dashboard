import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, PATCH } from "../src/app/api/account/route";
import { createDashboardSession } from "../src/lib/authSession";

function request(url: string, init: RequestInit = {}) {
  return new NextRequest(url, init);
}

async function authCookie(user = { id: "user-123", email: "employee@liminull.com", name: "Old Name", role: "employee" }) {
  const session = await createDashboardSession(user, "session-signing-secret", 60 * 60 * 8);
  return `hermes_dashboard_auth=${session}`;
}

describe("employee account API", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-signing-secret";
    process.env.NODE_ENV = "production";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "user-123",
            email: "employee@liminull.com",
            user_metadata: { full_name: "Updated Name", role: "employee" },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the authenticated employee profile from the signed dashboard session", async () => {
    const response = await GET(
      request("https://dashboard.example.com/api/account", {
        headers: { cookie: await authCookie() },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        id: "user-123",
        email: "employee@liminull.com",
        name: "Old Name",
        role: "employee",
      },
    });
  });

  it("updates an employee display name through Supabase admin auth and refreshes the signed session", async () => {
    const response = await PATCH(
      request("https://dashboard.example.com/api/account", {
        method: "PATCH",
        headers: {
          cookie: await authCookie(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Updated Name" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        id: "user-123",
        email: "employee@liminull.com",
        name: "Updated Name",
        role: "employee",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/admin/users/user-123",
      expect.objectContaining({ method: "PUT", cache: "no-store" })
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("apikey")).toBe("service-role-key");
    expect(headers.get("authorization")).toBe("Bearer service-role-key");
    expect(options?.body).toBe(JSON.stringify({ user_metadata: { full_name: "Updated Name" } }));

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("hermes_dashboard_auth=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).not.toContain("service-role-key");
  });

  it("updates an employee password without returning or storing it in the session cookie", async () => {
    const response = await PATCH(
      request("https://dashboard.example.com/api/account", {
        method: "PATCH",
        headers: {
          cookie: await authCookie(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "new-secure-password" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        id: "user-123",
        email: "employee@liminull.com",
        name: "Updated Name",
        role: "employee",
      },
    });
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.body).toBe(JSON.stringify({ password: "new-secure-password" }));
    expect(response.headers.get("set-cookie") || "").not.toContain("new-secure-password");
  });

  it("rejects unauthenticated account updates", async () => {
    const response = await PATCH(
      request("https://dashboard.example.com/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Not authenticated" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a password to be at least 8 characters", async () => {
    const response = await PATCH(
      request("https://dashboard.example.com/api/account", {
        method: "PATCH",
        headers: {
          cookie: await authCookie(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "short" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Password must be at least 8 characters" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
