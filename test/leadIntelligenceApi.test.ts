import { describe, expect, it } from "vitest";

import { GET, PATCH, POST } from "../src/app/api/lead-intelligence/route";
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

function request(body: unknown) {
  return new Request("https://dashboard.example.com/api/lead-intelligence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("lead intelligence API", () => {
  it("creates and persists a deterministic draft packet without calling external services", async () => {
    process.env.LEAD_INTELLIGENCE_PACKET_STORE_PATH = `api-create-${Date.now()}`;
    const response = await POST(request({ lead }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.packet).toMatchObject({
      id: expect.stringContaining("packet-austin-smile-studio"),
      leadId: "google:no-site",
      company: "Austin Smile Studio",
      status: "draft",
      recommendedOffer: "AI intake automation sprint",
    });
    expect(data.packet.approvalNote).toContain("Review before using externally");
    expect(JSON.stringify(data)).not.toContain("GOOGLE_PLACES_API_KEY");
  });

  it("lists saved lead intelligence packets", async () => {
    process.env.LEAD_INTELLIGENCE_PACKET_STORE_PATH = `api-list-${Date.now()}`;
    await POST(request({ lead }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.packets).toHaveLength(1);
    expect(data.packets[0].leadId).toBe("google:no-site");
  });

  it("updates packet status after review", async () => {
    process.env.LEAD_INTELLIGENCE_PACKET_STORE_PATH = `api-status-${Date.now()}`;
    await POST(request({ lead }));

    const response = await PATCH(request({ leadId: lead.id, status: "approved" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.packet.status).toBe("approved");
  });

  it("rejects missing lead payloads", async () => {
    const response = await POST(request({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ ok: false, error: "lead is required" });
  });
});
