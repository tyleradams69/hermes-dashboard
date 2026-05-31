import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mapClientWorkspaceToRow,
  mapRowToClientWorkspace,
  SupabaseClientWorkspaceStore,
} from "../src/lib/clientWorkspaceStore";
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

const workspace = buildClientWorkspaceFromPipelineLead(
  { ...createPipelineLead(scrapedLead, "Tyler"), stage: "closed_won" },
  new Date("2026-05-20T22:42:51.880Z")
);

describe("client workspace store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps client workspaces to the public.client_workspaces SQL schema", () => {
    expect(mapClientWorkspaceToRow(workspace)).toMatchObject({
      id: "client-google-place-1-tyler",
      source_lead_id: "google:place-1:tyler",
      name: "Austin Automation Clinic",
      owner: "Tyler",
      phase: "handoff",
      package_fit: "AI intake",
      website: "https://clinic.example.com",
      phone: "+1 512-555-0110",
      location: "10 Congress Ave, Austin, TX",
      next_deliverable: "Collect brand, access, intake, and workflow assets for delivery kickoff",
      asset_checklist: expect.arrayContaining(["Current intake/contact form details"]),
      asset_checklist_completed: [],
      launch_status: "not_started",
    });
  });

  it("maps SQL rows back to client workspaces", () => {
    expect(
      mapRowToClientWorkspace({
        id: "client-google-place-1",
        source_lead_id: "google:place-1",
        name: "Austin Automation Clinic",
        owner: "Tyler",
        phase: "handoff",
        package_fit: "AI intake",
        website: "https://clinic.example.com",
        phone: "+1 512-555-0110",
        location: "Austin, TX",
        next_deliverable: "Kickoff",
        asset_checklist: ["Domain access"],
        asset_checklist_completed: ["Domain access"],
        launch_status: "in_progress",
        internal_notes: "Converted from pipeline",
        created_at: "2026-05-20T22:42:51.880Z",
        updated_at: "2026-05-20T22:45:51.880Z",
      })
    ).toMatchObject({
      id: "client-google-place-1",
      sourceLeadId: "google:place-1",
      packageFit: "AI intake",
      nextDeliverable: "Kickoff",
      assetChecklist: ["Domain access"],
      assetChecklistCompleted: ["Domain access"],
      launchStatus: "in_progress",
      updatedAt: "2026-05-20T22:45:51.880Z",
    });
  });

  it("uses Supabase service-role storage for dedicated durable list and upsert", async () => {
    const fetchMock = vi.fn(async () => {
      const body = JSON.stringify([
        {
          ...mapClientWorkspaceToRow(workspace),
          created_at: workspace.createdAt,
          updated_at: workspace.updatedAt,
        },
      ]);
      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = new SupabaseClientWorkspaceStore({
      url: "https://liminull.supabase.co",
      serviceRoleKey: "server-only-service-role-key",
    });

    const saved = await store.upsertWorkspace(workspace);
    const listed = await store.listWorkspaces();

    expect(saved).toMatchObject({ sourceLeadId: workspace.sourceLeadId, name: "Austin Automation Clinic" });
    expect(listed).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/client_workspaces?on_conflict=source_lead_id",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer server-only-service-role-key",
          prefer: "resolution=merge-duplicates,return=representation",
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/client_workspaces?select=*&order=updated_at.desc",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("falls back to durable lead metadata when the client_workspaces table is not installed yet", async () => {
    const missingTable = new Response(
      JSON.stringify({
        code: "PGRST205",
        message: "Could not find the table 'public.client_workspaces' in the schema cache",
      }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
    const metadataRow = {
      metadata: { clientWorkspace: workspace },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(missingTable)
      .mockResolvedValueOnce(new Response(JSON.stringify([{}]), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(missingTable.clone())
      .mockResolvedValueOnce(new Response(JSON.stringify([metadataRow]), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new SupabaseClientWorkspaceStore({
      url: "https://liminull.supabase.co",
      serviceRoleKey: "server-only-service-role-key",
    });

    await expect(store.upsertWorkspace(workspace)).resolves.toMatchObject({ sourceLeadId: workspace.sourceLeadId });
    await expect(store.listWorkspaces()).resolves.toMatchObject([{ sourceLeadId: workspace.sourceLeadId }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://liminull.supabase.co/rest/v1/lead_pipeline?id=eq.${encodeURIComponent(workspace.sourceLeadId)}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
