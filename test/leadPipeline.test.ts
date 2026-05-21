import { describe, expect, it } from "vitest";

import {
  createPipelineLead,
  importLeadIntoPipeline,
  normalizeLeadDedupeKey,
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
});
