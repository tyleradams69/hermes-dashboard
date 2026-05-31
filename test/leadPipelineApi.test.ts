import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { GET, PATCH, POST } from "../src/app/api/lead-pipeline/route";

const lead = {
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
  return new Request("https://dashboard.example.com/api/lead-pipeline", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("lead pipeline API", () => {
  let dir = "";

  beforeEach(async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    dir = await mkdtemp(join(tmpdir(), "lead-pipeline-test-"));
    process.env.LEAD_PIPELINE_STORE_PATH = join(dir, "pipeline.json");
  });

  afterEach(async () => {
    delete process.env.LEAD_PIPELINE_STORE_PATH;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.unstubAllGlobals();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("imports leads once globally and rejects duplicates for another employee", async () => {
    const first = await POST(jsonRequest("POST", { lead, owner: "Tyler" }));
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ ok: true, lead: { owner: "Tyler", phone: "+1 512-555-0110" } });

    const duplicate = await POST(jsonRequest("POST", { lead, owner: "Jack" }));
    const duplicateJson = await duplicate.json();

    expect(duplicate.status).toBe(409);
    expect(duplicateJson).toMatchObject({
      ok: false,
      reason: "duplicate_owned_by_other_employee",
      existingLead: { owner: "Tyler", company: "Austin Automation Clinic" },
    });
  });

  it("lists and updates pipeline leads", async () => {
    const created = await POST(jsonRequest("POST", { lead, owner: "Tyler" }));
    const createdJson = await created.json();

    const patched = await PATCH(
      jsonRequest("PATCH", {
        id: createdJson.lead.id,
        stage: "contacted",
        notes: "Called and left voicemail",
        nextAction: "Call again tomorrow",
      })
    );

    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ ok: true, lead: { stage: "contacted", notes: "Called and left voicemail" } });

    const listed = await GET();
    expect(await listed.json()).toMatchObject({ ok: true, leads: [{ stage: "contacted", owner: "Tyler" }] });
  });

  it("uses Supabase storage instead of the local JSON file when server credentials are configured", async () => {
    process.env.SUPABASE_URL = "https://liminull.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-service-role-key";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: "3bb6cc7f-9f03-4f6f-994d-8a5b2ed3d4ab",
            dedupe_key: "google:place-1",
            source: "google_places",
            company: "Austin Automation Clinic",
            location: "Austin, TX",
            niche: "AI intake",
            ai_intent: "High",
            score: 94,
            owner: "Tyler",
            stage: "new_lead",
            notes: "",
            next_action: "Qualify and contact decision maker",
            evidence: [],
            created_at: "2026-05-20T22:42:51.880Z",
            updated_at: "2026-05-20T22:42:51.880Z",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const listed = await GET();
    const listedJson = await listed.json();

    expect(listedJson).toMatchObject({ ok: true, leads: [{ owner: "Tyler", company: "Austin Automation Clinic" }] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_pipeline?select=*&order=created_at.desc",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer server-only-service-role-key",
        }),
      })
    );
  });

  it("imports through Supabase without writing a local JSON fallback file", async () => {
    process.env.SUPABASE_URL = "https://liminull.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-service-role-key";
    process.env.LEAD_PIPELINE_STORE_PATH = "/proc/hermes-dashboard-lead-pipeline.json";

    const row = {
      id: "3bb6cc7f-9f03-4f6f-994d-8a5b2ed3d4ab",
      dedupe_key: "google:place-1",
      source: "google_places",
      company: "Austin Automation Clinic",
      location: "Austin, TX",
      niche: "AI intake",
      ai_intent: "High",
      phone: "+1 512-555-0110",
      website: "https://clinic.example.com",
      score: 94,
      owner: "Tyler",
      stage: "new_lead",
      notes: "",
      next_action: "Qualify and contact decision maker",
      evidence: ["4.9 stars from 145 Google reviews"],
      created_at: "2026-05-20T22:42:51.880Z",
      updated_at: "2026-05-20T22:42:51.880Z",
    };

    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify([row]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const imported = await POST(jsonRequest("POST", { lead, owner: "Tyler" }));
    const importedJson = await imported.json();

    expect(imported.status).toBe(201);
    expect(importedJson).toMatchObject({ ok: true, lead: { owner: "Tyler", company: "Austin Automation Clinic" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_pipeline",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_pipeline?select=*&order=created_at.desc",
      expect.objectContaining({ method: "GET" })
    );
  });
});
