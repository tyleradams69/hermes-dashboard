import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "../src/app/api/client-workspaces/route";
import { buildClientWorkspaceFromPipelineLead } from "../src/lib/clientWorkspace";
import { createPipelineLead } from "../src/lib/leadPipeline";
import type { LeadRecord } from "../src/lib/leadScraper";

const scrapedLead: LeadRecord = {
  id: "google:place-1",
  company: "Austin Automation Clinic",
  source: "google_places",
  location: "10 Congress Ave, Austin, TX",
  niche: "AI intake",
  size: "local",
  aiIntent: "High",
  evidence: ["4.9 stars from 145 Google reviews"],
  rating: 4.9,
  reviewCount: 145,
  phone: "+1 512-555-0110",
  website: "https://clinic.example.com",
  score: 94,
};

function jsonRequest(method: string, body?: unknown) {
  return new Request("https://dashboard.example.com/api/client-workspaces", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("client workspaces API", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.CLIENT_WORKSPACE_STORE_PATH = `test-${crypto.randomUUID()}`;
  });

  afterEach(() => {
    delete process.env.CLIENT_WORKSPACE_STORE_PATH;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates and lists client delivery workspaces", async () => {
    const workspace = buildClientWorkspaceFromPipelineLead(
      { ...createPipelineLead(scrapedLead, "Tyler"), stage: "closed_won" },
      new Date("2026-05-20T22:42:51.880Z")
    );

    const created = await POST(jsonRequest("POST", { workspace }));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      workspace: { sourceLeadId: "google:place-1:tyler", name: "Austin Automation Clinic" },
    });

    const listed = await GET();
    expect(await listed.json()).toMatchObject({
      ok: true,
      workspaces: [{ sourceLeadId: "google:place-1:tyler", name: "Austin Automation Clinic" }],
    });
  });

  it("rejects invalid workspace payloads", async () => {
    const response = await POST(jsonRequest("POST", { workspace: { name: "Missing fields" } }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "workspace is required" });
  });
});
