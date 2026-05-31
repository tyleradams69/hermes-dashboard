import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildLeadSearchRun,
  mapLeadSearchRunToRow,
  mapRowToLeadSearchRun,
  MemoryLeadSearchRunStore,
  SupabaseLeadSearchRunStore,
} from "../src/lib/leadSearchRunStore";

const run = buildLeadSearchRun({
  input: {
    business: "dentists",
    location: "Austin, TX",
    distanceMiles: 25,
    niche: "AI intake automation",
    onlyWithoutWebsite: true,
    hasPhoneOnly: true,
    minRating: 4.4,
    minReviews: 25,
    weakWebsiteCandidate: true,
  },
  resultCount: 8,
  topLeadCompany: "Austin Smile Studio",
  warnings: ["Google Places status: OK"],
  createdAt: new Date("2026-05-20T22:42:51.880Z"),
});

describe("lead search run store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LEAD_SEARCH_RUN_STORE_PATH;
  });

  it("maps lead search runs to the public.lead_search_runs SQL schema", () => {
    expect(mapLeadSearchRunToRow(run)).toMatchObject({
      id: "run-dentists-austin-tx-ai-intake-automation-1779316971880",
      business: "dentists",
      location: "Austin, TX",
      distance_miles: 25,
      niche: "AI intake automation",
      only_without_website: true,
      has_phone_only: true,
      min_rating: 4.4,
      min_reviews: 25,
      weak_website_candidate: true,
      result_count: 8,
      top_lead_company: "Austin Smile Studio",
      warnings: ["Google Places status: OK"],
    });
  });

  it("maps SQL rows back to normalized lead search runs", () => {
    const mapped = mapRowToLeadSearchRun({
      ...mapLeadSearchRunToRow(run),
      min_rating: 6,
      min_reviews: 20.4,
    });

    expect(mapped.input).toMatchObject({
      business: "dentists",
      location: "Austin, TX",
      distanceMiles: 25,
      minRating: 5,
      minReviews: 20,
      weakWebsiteCandidate: true,
    });
    expect(mapped.resultCount).toBe(8);
  });

  it("keeps memory history deduplicated by search inputs", async () => {
    process.env.LEAD_SEARCH_RUN_STORE_PATH = `test-${crypto.randomUUID()}`;
    const store = new MemoryLeadSearchRunStore();

    await store.saveRun(run);
    await store.saveRun({ ...run, id: "newer-run", resultCount: 3 });

    await expect(store.listRuns()).resolves.toMatchObject([{ id: "newer-run", resultCount: 3 }]);
  });

  it("uses Supabase service-role storage for durable list and save", async () => {
    const fetchMock = vi.fn(async () => {
      const body = JSON.stringify([mapLeadSearchRunToRow(run)]);
      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = new SupabaseLeadSearchRunStore({
      url: "https://liminull.supabase.co",
      serviceRoleKey: "server-only-service-role-key",
    });

    const saved = await store.saveRun(run);
    const listed = await store.listRuns();

    expect(saved).toMatchObject({ id: run.id, resultCount: 8 });
    expect(listed).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_search_runs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer server-only-service-role-key",
          prefer: "return=representation",
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://liminull.supabase.co/rest/v1/lead_search_runs?select=*&order=created_at.desc&limit=12",
      expect.objectContaining({ method: "GET" })
    );
  });
});
