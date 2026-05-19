import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { POST as loginPost } from "../src/app/api/login/route";
import { GET as hermesGet, POST as hermesPost } from "../src/app/api/hermes/[...path]/route";
import { proxy } from "../src/proxy";

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
    process.env.TYLER_DASHBOARD_PASSWORD = "correct-password";
    process.env.JACK_DASHBOARD_PASSWORD = "other-password";
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-token";
    process.env.NODE_ENV = "production";
  });

  it("sets an httpOnly secure bounded session cookie on successful login", async () => {
    const response = await loginPost(
      jsonRequest("https://dashboard.example.com/api/login", { password: "correct-password" }, { "x-forwarded-for": "203.0.113.10" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("hermes_dashboard_auth=session-token");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("secure");
    expect(setCookie.toLowerCase()).toContain("samesite=strict");
    expect(setCookie.toLowerCase()).toContain("max-age=28800");
  });

  it("rejects invalid passwords", async () => {
    const response = await loginPost(
      jsonRequest("https://dashboard.example.com/api/login", { password: "wrong-password" }, { "x-forwarded-for": "203.0.113.11" })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid password" });
  });

  it("rate limits repeated login attempts from the same forwarded client IP", async () => {
    const headers = { "x-forwarded-for": "203.0.113.12" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginPost(
        jsonRequest("https://dashboard.example.com/api/login", { password: "wrong-password" }, headers)
      );
      expect(response.status).toBe(401);
    }

    const blocked = await loginPost(
      jsonRequest("https://dashboard.example.com/api/login", { password: "wrong-password" }, headers)
    );

    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, error: "Too many login attempts" });
  });
});

describe("protected dashboard proxy", () => {
  beforeEach(() => {
    process.env.HERMES_DASHBOARD_SESSION_TOKEN = "session-token";
  });

  it("redirects unauthenticated private pages to /login", () => {
    const response = proxy(nextRequest("https://dashboard.example.com/operations"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://dashboard.example.com/login");
  });

  it("allows public login API requests", () => {
    const response = proxy(nextRequest("https://dashboard.example.com/api/login"));

    expect(response.status).toBe(200);
  });

  it("allows authenticated private pages", () => {
    const response = proxy(
      nextRequest("https://dashboard.example.com/operations", {
        cookie: "hermes_dashboard_auth=session-token",
      })
    );

    expect(response.status).toBe(200);
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
