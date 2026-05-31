import { describe, expect, it } from "vitest";

import {
  buildLeadIntelligencePacket,
  buildLeadSalesActionBrief,
  formatLeadIntelligencePacketForCopy,
  formatLeadSalesActionBriefForCopy,
} from "../src/lib/leadIntelligence";
import type { LeadRecord } from "../src/lib/leadScraper";

const noWebsiteLead: LeadRecord = {
  id: "google:no-site",
  company: "Austin Smile Studio",
  source: "google_places",
  location: "100 Congress Ave, Austin, TX",
  niche: "AI intake automation",
  size: "local",
  aiIntent: "High",
  evidence: ["4.8 stars from 126 Google reviews", "Categories: dentist, health"],
  rating: 4.8,
  reviewCount: 126,
  phone: "+1 512-555-0101",
  score: 94,
};

describe("lead intelligence packets", () => {
  it("builds a deterministic sales packet for a no-website local lead", () => {
    const packet = buildLeadIntelligencePacket(noWebsiteLead, new Date("2026-05-31T12:00:00.000Z"));

    expect(packet).toMatchObject({
      leadId: "google:no-site",
      company: "Austin Smile Studio",
      status: "draft",
      generatedAt: "2026-05-31T12:00:00.000Z",
      recommendedOffer: "AI intake automation sprint",
    });
    expect(packet.painHypothesis).toContain("Google profile is doing too much of the first-impression work");
    expect(packet.websiteNotes).toContain("No full website is attached");
    expect(packet.outreachHook).toContain("short intake audit");
    expect(packet.discoveryQuestions).toContain("How are missed calls, form fills, and after-hours inquiries handled today?");
    expect(packet.approvalNote).toContain("Review before using externally");
  });

  it("adapts the packet when the lead has a weak platform website", () => {
    const packet = buildLeadIntelligencePacket(
      {
        ...noWebsiteLead,
        id: "google:weak-site",
        website: "https://austin-smile.business.site",
        phone: undefined,
        score: 78,
      },
      new Date("2026-05-31T12:00:00.000Z")
    );

    expect(packet.websiteNotes).toContain("platform/profile-style website");
    expect(packet.painHypothesis).toContain("Booking and follow-up may be leaking");
    expect(packet.outreachHook).toContain("friction points");
  });

  it("formats a copy-ready internal packet with review-gated sections", () => {
    const packet = buildLeadIntelligencePacket(noWebsiteLead, new Date("2026-05-31T12:00:00.000Z"));
    const copy = formatLeadIntelligencePacketForCopy(packet);

    expect(copy).toContain("Lead Intelligence Packet: Austin Smile Studio");
    expect(copy).toContain("Status: draft");
    expect(copy).toContain("Recommended offer: AI intake automation sprint");
    expect(copy).toContain("Pain hypothesis:");
    expect(copy).toContain("Outreach hook:");
    expect(copy).toContain("Discovery questions:");
    expect(copy).toContain("1. How are missed calls, form fills, and after-hours inquiries handled today?");
    expect(copy).toContain("Review before using externally");
  });

  it("turns approved packets into discovery, audit, and proposal prep", () => {
    const packet = {
      ...buildLeadIntelligencePacket(noWebsiteLead, new Date("2026-05-31T12:00:00.000Z")),
      status: "approved" as const,
    };
    const brief = buildLeadSalesActionBrief(packet);
    const copy = formatLeadSalesActionBriefForCopy(brief);

    expect(brief.readinessLabel).toBe("Approved sales prep");
    expect(brief.discoveryAgenda).toContain("Confirm current lead sources, response times, and missed-call/form-fill handling.");
    expect(brief.miniAuditOutline.join(" ")).toContain("Google profile is doing too much");
    expect(brief.proposalOutline).toContain("Recommended offer: AI intake automation sprint");
    expect(brief.nextStep).toContain("prep the discovery call");
    expect(copy).toContain("Sales Action Brief: Austin Smile Studio");
    expect(copy).toContain("Discovery agenda:");
    expect(copy).toContain("Mini audit outline:");
    expect(copy).toContain("Proposal outline:");
    expect(copy).toContain("Internal Liminull prep only");
  });

  it("keeps draft sales prep blocked from external use", () => {
    const packet = buildLeadIntelligencePacket(noWebsiteLead, new Date("2026-05-31T12:00:00.000Z"));
    const brief = buildLeadSalesActionBrief(packet);

    expect(brief.readinessLabel).toBe("Draft prep — approve packet before external use");
    expect(brief.nextStep).toContain("Approve the intelligence packet before sending");
  });
});
