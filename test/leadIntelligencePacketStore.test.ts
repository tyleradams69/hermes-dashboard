import { afterEach, describe, expect, it, vi } from "vitest";

import { buildLeadIntelligencePacket } from "../src/lib/leadIntelligence";
import {
  mapLeadIntelligencePacketToRow,
  mapRowToLeadIntelligencePacket,
  MemoryLeadIntelligencePacketStore,
  SupabaseLeadIntelligencePacketStore,
} from "../src/lib/leadIntelligencePacketStore";
import type { LeadRecord } from "../src/lib/leadScraper";

const lead: LeadRecord = {
  id: "google:no-site",
  company: "Austin Smile Studio",
  source: "google_places",
  location: "100 Congress Ave, Austin, TX",
  niche: "AI intake automation",
  size: "local",
  aiIntent: "High",
  evidence: ["4.8 stars from 126 Google reviews"],
  rating: 4.8,
  reviewCount: 126,
  phone: "+1 512-555-0101",
  score: 94,
};

const packet = buildLeadIntelligencePacket(lead, new Date("2026-05-31T12:00:00.000Z"));

describe("lead intelligence packet store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps packets to and from Supabase rows", () => {
    const row = mapLeadIntelligencePacketToRow(packet);

    expect(row).toMatchObject({
      id: packet.id,
      lead_id: "google:no-site",
      company: "Austin Smile Studio",
      status: "draft",
      recommended_offer: "AI intake automation sprint",
    });
    expect(mapRowToLeadIntelligencePacket({ ...row, created_at: packet.generatedAt, updated_at: packet.generatedAt })).toEqual(packet);
  });

  it("upserts and updates packet status in memory", async () => {
    process.env.LEAD_INTELLIGENCE_PACKET_STORE_PATH = `test-${Date.now()}`;
    const store = new MemoryLeadIntelligencePacketStore();

    await store.upsertPacket(packet);
    const approved = await store.updateStatus(packet.leadId, "approved");

    expect(approved.status).toBe("approved");
    expect(await store.listPackets()).toHaveLength(1);
  });

  it("upserts packets through Supabase using lead_id conflict resolution", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ ...mapLeadIntelligencePacketToRow(packet), created_at: packet.generatedAt, updated_at: packet.generatedAt }]), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = new SupabaseLeadIntelligencePacketStore({ url: "https://example.supabase.co", serviceRoleKey: "service-role" });
    const saved = await store.upsertPacket(packet);

    expect(saved).toEqual(packet);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/lead_intelligence_packets?on_conflict=lead_id",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ prefer: "resolution=merge-duplicates,return=representation" }),
      })
    );
  });
});
