import { describe, expect, it } from "vitest";

import {
  createPipelineLead,
  deriveLeadPriority,
  filterPipelineLeads,
  importLeadIntoPipeline,
  normalizeLeadDedupeKey,
  selectTodayFocusLeads,
  updatePipelineLead,
  type LeadPipelineState,
} from "../src/lib/leadPipeline";
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

describe("lead pipeline helpers", () => {
  it("normalizes duplicate keys from Google place ids before company names", () => {
    expect(normalizeLeadDedupeKey(scrapedLead)).toBe("google:place-1");
    expect(normalizeLeadDedupeKey({ ...scrapedLead, id: "manual", company: "  Austin Automation Clinic!!! " })).toBe(
      "company:austin-automation-clinic"
    );
  });

  it("imports a scraped lead into an employee pipeline with contact fields", () => {
    const imported = createPipelineLead(scrapedLead, "Tyler");

    expect(imported).toMatchObject({
      company: "Austin Automation Clinic",
      owner: "Tyler",
      stage: "new_lead",
      dedupeKey: "google:place-1",
      phone: "+1 512-555-0110",
      website: "https://clinic.example.com",
      score: 94,
    });
    expect(imported.createdAt).toBeTruthy();
  });

  it("prevents one employee from importing a duplicate lead already owned by another employee", () => {
    const state: LeadPipelineState = { leads: [createPipelineLead(scrapedLead, "Tyler")] };

    const result = importLeadIntoPipeline(state, scrapedLead, "Jack");

    expect(result.imported).toBe(false);
    expect(result.reason).toBe("duplicate_owned_by_other_employee");
    expect(result.existingLead?.owner).toBe("Tyler");
    expect(result.state.leads).toHaveLength(1);
  });

  it("updates stage, owner notes, and follow-up fields without changing duplicate identity", () => {
    const lead = createPipelineLead(scrapedLead, "Tyler");
    const updated = updatePipelineLead(lead, {
      stage: "contacted",
      notes: "Called owner, asked for demo next week",
      nextAction: "Send demo times",
    });

    expect(updated).toMatchObject({
      stage: "contacted",
      notes: "Called owner, asked for demo next week",
      nextAction: "Send demo times",
      dedupeKey: "google:place-1",
    });
    expect(updated.updatedAt).not.toBe(lead.updatedAt);
  });

  it("derives priority from score, contactability, weak web presence, and stale follow-up", () => {
    const staleHighFitLead = {
      ...createPipelineLead({ ...scrapedLead, phone: undefined, website: undefined, score: 92 }, "Tyler"),
      updatedAt: "2026-05-01T12:00:00.000Z",
    };

    const priority = deriveLeadPriority(staleHighFitLead, new Date("2026-05-06T12:00:00.000Z"));

    expect(priority.tier).toBe("hot");
    expect(priority.score).toBeGreaterThanOrEqual(90);
    expect(priority.signals).toEqual(
      expect.arrayContaining(["high score", "no website", "stale next action"])
    );
    expect(priority.signals).not.toContain("phone available");
  });

  it("selects today's focus leads sorted by priority and excludes closed leads", () => {
    const now = new Date("2026-05-06T12:00:00.000Z");
    const hot = {
      ...createPipelineLead({ ...scrapedLead, id: "google:hot", score: 96, website: undefined }, "Tyler"),
      updatedAt: "2026-05-02T12:00:00.000Z",
    };
    const warm = createPipelineLead({ ...scrapedLead, id: "google:warm", score: 78 }, "Jack");
    const closed = {
      ...createPipelineLead({ ...scrapedLead, id: "google:closed", score: 99, website: undefined }, "Tyler"),
      stage: "closed_won" as const,
    };

    const focus = selectTodayFocusLeads([warm, closed, hot], now, 2);

    expect(focus.map((lead) => lead.id)).toEqual([hot.id, warm.id]);
  });

  it("filters pipeline leads by owner, stage, no website, phone presence, and hot score", () => {
    const tylerHotNoWebsite = createPipelineLead({ ...scrapedLead, id: "google:tyler-hot", score: 91, website: undefined }, "Tyler");
    const jackHotWithWebsite = createPipelineLead({ ...scrapedLead, id: "google:jack-hot", score: 92 }, "Jack");
    const tylerWarmNoPhone = createPipelineLead(
      { ...scrapedLead, id: "google:tyler-warm", score: 70, phone: undefined, website: undefined },
      "Tyler"
    );

    expect(
      filterPipelineLeads([tylerWarmNoPhone, jackHotWithWebsite, tylerHotNoWebsite], {
        owner: "Tyler",
        stage: "new_lead",
        noWebsiteOnly: true,
        hasPhoneOnly: true,
        hotScoreOnly: true,
      }).map((lead) => lead.id)
    ).toEqual([tylerHotNoWebsite.id]);
  });
});
