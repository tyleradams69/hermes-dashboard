import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { POST as loginPost } from "../src/app/api/login/route";
import { GET as hermesGet, POST as hermesPost } from "../src/app/api/hermes/[...path]/route";
import { proxy } from "../src/proxy";
import { createDashboardSession } from "../src/lib/authSession";

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function nextRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe("dashboard login security", () => {
  beforeEach(() => {
    delete process.env.TYLER_DASHBOARD_PASSWORD;
    delete process.env.JACK_DASHBOARD_PASSWORD;
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-signing-secret";
    process.env.NODE_ENV = "production";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: "supabase-access-token",
            refresh_token: "supabase-refresh-token",
            expires_in: 3600,
            user: {
              id: "user-123",
              email: "employee@liminull.com",
              user_metadata: { full_name: "Liminull Employee", role: "employee" },
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authenticates employees through Supabase Auth and sets an httpOnly signed session cookie", async () => {
    const response = await loginPost(
      jsonRequest(
        "https://dashboard.example.com/api/login",
        { email: "employee@liminull.com", password: "correct-password" },
        { "x-forwarded-for": "203.0.113.10" }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        id: "user-123",
        email: "employee@liminull.com",
        name: "Liminull Employee",
        role: "employee",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("apikey")).toBe("public-anon-key");
    expect(headers.get("authorization")).toBe("Bearer public-anon-key");
    expect(options?.body).toBe(
      JSON.stringify({ email: "employee@liminull.com", password: "correct-password" })
    );

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("hermes_dashboard_auth=");
    expect(setCookie).not.toContain("correct-password");
    expect(setCookie).not.toContain("supabase-access-token");
    expect(setCookie).not.toContain("supabase-refresh-token");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("secure");
    expect(setCookie.toLowerCase()).toContain("samesite=strict");
    expect(setCookie.toLowerCase()).toContain("max-age=28800");
  });

  it("normalizes quoted Supabase env values before calling Supabase Auth", async () => {
    process.env.SUPABASE_URL = '"https://project.supabase.co"';
    process.env.SUPABASE_ANON_KEY = '"public-anon-key"';
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = '"session-signing-secret"';

    const response = await loginPost(
      jsonRequest(
        "https://dashboard.example.com/api/login",
        { email: "employee@liminull.com", password: "correct-password" },
        { "x-forwarded-for": "203.0.113.13" }
      )
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("apikey")).toBe("public-anon-key");
    expect(headers.get("authorization")).toBe("Bearer public-anon-key");
    expect(response.headers.get("set-cookie") || "").toContain("hermes_dashboard_auth=");
  });

  it("falls back to configured employee passwords when Supabase Auth is unreachable", async () => {
    process.env.TYLER_DASHBOARD_PASSWORD = "local-tyler-password";
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await loginPost(
      jsonRequest(
        "https://dashboard.example.com/api/login",
        { email: "tyler@liminull.com", password: "local-tyler-password" },
        { "x-forwarded-for": "203.0.113.14" }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        id: "env-tyler",
        email: "tyler@liminull.com",
        name: "Tyler",
        role: "admin",
      },
    });
    expect(response.headers.get("set-cookie") || "").toContain("hermes_dashboard_auth=");
  });

  it("rejects invalid Supabase employee credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error_description: "Invalid login credentials" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    const response = await loginPost(
      jsonRequest(
        "https://dashboard.example.com/api/login",
        { email: "employee@liminull.com", password: "wrong-password" },
        { "x-forwarded-for": "203.0.113.11" }
      )
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid email or password" });
  });

  it("rate limits repeated login attempts from the same forwarded client IP", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error_description: "Invalid login credentials" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );
    const headers = { "x-forwarded-for": "203.0.113.12" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginPost(
        jsonRequest(
          "https://dashboard.example.com/api/login",
          { email: "employee@liminull.com", password: "wrong-password" },
          headers
        )
      );
      expect(response.status).toBe(401);
    }

    const blocked = await loginPost(
      jsonRequest(
        "https://dashboard.example.com/api/login",
        { email: "employee@liminull.com", password: "wrong-password" },
        headers
      )
    );

    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, error: "Too many login attempts" });
  });
});

describe("protected dashboard proxy", () => {
  beforeEach(() => {
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-signing-secret";
  });

  it("redirects unauthenticated private pages to /login", async () => {
    const response = proxy(nextRequest("https://dashboard.example.com/operations"));

    expect((await response).status).toBe(307);
    expect((await response).headers.get("location")).toBe("https://dashboard.example.com/login");
  });

  it("allows public login API requests", async () => {
    const response = await proxy(nextRequest("https://dashboard.example.com/api/login"));

    expect(response.status).toBe(200);
  });

  it("allows private pages only with a valid signed employee session", async () => {
    const session = await createDashboardSession(
      {
        id: "user-123",
        email: "employee@liminull.com",
        name: "Liminull Employee",
        role: "employee",
      },
      "session-signing-secret",
      60 * 60 * 8
    );
    const response = await proxy(
      nextRequest("https://dashboard.example.com/operations", {
        cookie: `hermes_dashboard_auth=${session}`,
      })
    );

    expect(response.status).toBe(200);
  });

  it("rejects forged dashboard session cookies", async () => {
    const response = await proxy(
      nextRequest("https://dashboard.example.com/operations", {
        cookie: "hermes_dashboard_auth=forged-session-token",
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://dashboard.example.com/login");
  });
});

describe("Hermes API server-side proxy", () => {
  beforeEach(() => {
    process.env.HERMES_API_URL = "https://api.example.com/";
    process.env.HERMES_API_TOKEN = "private-api-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "content-encoding": "gzip",
          "x-upstream": "yes",
        },
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards requests to HERMES_API_URL and injects HERMES_API_TOKEN server-side", async () => {
    const response = await hermesGet(
      nextRequest("https://dashboard.example.com/api/hermes/api/activity?businessId=liminull", {
        "x-hermes-token": "browser-should-not-win",
      }),
      { params: Promise.resolve({ path: ["api", "activity"] }) }
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("x-upstream")).toBe("yes");
    expect(response.headers.has("content-encoding")).toBe(false);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/activity?businessId=liminull",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        body: undefined,
      })
    );

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("x-hermes-token")).toBe("private-api-token");
    expect(headers.get("x-hermes-role")).toBe("admin");
  });

  it("forwards request bodies for mutating requests", async () => {
    await hermesPost(
      new NextRequest("https://dashboard.example.com/api/hermes/api/hermes-assistant", {
        method: "POST",
        body: JSON.stringify({ message: "hello" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ path: ["api", "hermes-assistant"] }) }
    );

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(ArrayBuffer);
  });
});
