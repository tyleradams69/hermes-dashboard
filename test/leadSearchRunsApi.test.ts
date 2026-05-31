import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "../src/app/api/lead-search-runs/route";

function jsonRequest(method: string, body?: unknown) {
  return new Request("https://dashboard.example.com/api/lead-search-runs", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("lead search runs API", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.LEAD_SEARCH_RUN_STORE_PATH = `test-${crypto.randomUUID()}`;
  });

  afterEach(() => {
    delete process.env.LEAD_SEARCH_RUN_STORE_PATH;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates and lists lead scraper search runs", async () => {
    const created = await POST(
      jsonRequest("POST", {
        input: {
          business: "med spas",
          location: "Cleveland, OH",
          distanceMiles: 35,
          niche: "AI booking follow-up",
          hasPhoneOnly: true,
        },
        resultCount: 5,
        topLeadCompany: "Lakewood Skin Studio",
      })
    );

    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      run: {
        input: { business: "med spas", location: "Cleveland, OH", hasPhoneOnly: true },
        resultCount: 5,
        topLeadCompany: "Lakewood Skin Studio",
      },
    });

    const listed = await GET();
    expect(await listed.json()).toMatchObject({
      ok: true,
      runs: [
        {
          input: { business: "med spas", location: "Cleveland, OH", hasPhoneOnly: true },
          resultCount: 5,
        },
      ],
    });
  });

  it("rejects missing search input", async () => {
    const response = await POST(jsonRequest("POST", { resultCount: 1 }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "input is required" });
  });
});
