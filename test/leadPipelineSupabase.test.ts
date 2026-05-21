import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mapPipelineLeadToSupabaseRow,
  mapSupabaseRowToPipelineLead,
  SupabaseLeadPipelineStore,
} from "../src/lib/leadPipelineSupabase";
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
  localPhone: "(512) 555-0110",
  website: "https://clinic.example.com",
  score: 94,
};

describe("Supabase lead pipeline store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps app pipeline leads to the public.lead_pipeline SQL schema without sending local string ids", () => {
    const lead = createPipelineLead(scrapedLead, "Tyler");
    const row = mapPipelineLeadToSupabaseRow(lead);

    expect(row).not.toHaveProperty("id");
    expect(row).toMatchObject({
      dedupe_key: "google:place-1",
      source: "google_places",
      source_external_id: "place-1",
      company: "Austin Automation Clinic",
      location: "10 Congress Ave, Austin, TX",
      niche: "AI intake",
      ai_intent: "High",
      phone: "+1 512-555-0110",
      local_phone: "(512) 555-0110",
      website: "https://clinic.example.com",
      score: 94,
      owner: "Tyler",
      stage: "new_lead",
      next_action: "Qualify and contact decision maker",
      evidence: ["4.9 stars from 145 Google reviews"],
    });
  });

  it("maps Supabase rows back to app pipeline leads", () => {
    expect(
      mapSupabaseRowToPipelineLead({
        id: "3bb6cc7f-9f03-4f6f-994d-8a5b2ed3d4ab",
        dedupe_key: "google:place-1",
        source: "google_places",
        company: "Austin Automation Clinic",
        location: "10 Congress Ave, Austin, TX",
        niche: "AI intake",
        ai_intent: "High",
        phone: "+1 512-555-0110",
        local_phone: "(512) 555-0110",
        website: "https://clinic.example.com",
        score: 94,
        owner: "Tyler",
        stage: "contacted",
        notes: "Called",
        next_action: "Follow up",
        evidence: ["review evidence"],
        created_at: "2026-05-20T22:42:51.880Z",
        updated_at: "2026-05-20T22:45:34.065Z",
      })
    ).toMatchObject({
      id: "3bb6cc7f-9f03-4f6f-994d-8a5b2ed3d4ab",
      dedupeKey: "google:place-1",
      company: "Austin Automation Clinic",
      localPhone: "(512) 555-0110",
      aiIntent: "High",
      nextAction: "Follow up",
      createdAt: "2026-05-20T22:42:51.880Z",
      updatedAt: "2026-05-20T22:45:34.065Z",
    });
  });

  it("uses the server-side service role key and never sends secrets to clients", async () => {
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

    const store = new SupabaseLeadPipelineStore({
      url: "https://liminull.supabase.co",
      serviceRoleKey: "server-only-service-role-key",
    });

    const leads = await store.listLeads();

    expect(leads).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_pipeline?select=*&order=created_at.desc",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "server-only-service-role-key",
          authorization: "Bearer server-only-service-role-key",
        }),
      })
    );
  });
});
