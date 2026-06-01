import { describe, expect, it } from "vitest";

import {
  buildPipelineBulkActionPatch,
  createPipelineLead,
  deriveLeadPriority,
  filterPipelineLeads,
  formatPipelineAttentionBriefForCopy,
  formatPipelineDailyBriefForCopy,
  formatPipelineLeadBriefForCopy,
  formatPipelineOwnerSummaryForCopy,
  getLeadQuickActions,
  importLeadIntoPipeline,
  isLeadStale,
  normalizeLeadDedupeKey,
  selectPipelineAttentionItems,
  selectStaleLeadNudges,
  selectTodayFocusLeads,
  summarizePipelineByOwner,
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
      lastTouchedAt: "2026-05-03T12:00:00.000Z",
      nextFollowUpAt: "2026-05-07T12:00:00.000Z",
      salesPrepStatus: "ready",
      prepWorkspaceNotes: "Proposal angle saved",
    });

    expect(updated).toMatchObject({
      stage: "contacted",
      notes: "Called owner, asked for demo next week",
      nextAction: "Send demo times",
      dedupeKey: "google:place-1",
      salesPrepStatus: "ready",
      prepWorkspaceNotes: "Proposal angle saved",
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

  it("selects stale follow-up nudges from due dates and untouched open leads", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const due = {
      ...createPipelineLead({ ...scrapedLead, id: "google:due" }, "Tyler"),
      nextFollowUpAt: "2026-05-09T12:00:00.000Z",
    };
    const stale = {
      ...createPipelineLead({ ...scrapedLead, id: "google:stale" }, "Tyler"),
      lastTouchedAt: "2026-05-01T12:00:00.000Z",
    };
    const fresh = {
      ...createPipelineLead({ ...scrapedLead, id: "google:fresh" }, "Tyler"),
      lastTouchedAt: "2026-05-10T10:00:00.000Z",
    };

    expect(isLeadStale(due, now)).toBe(true);
    expect(isLeadStale(fresh, now)).toBe(false);
    expect(selectStaleLeadNudges([fresh, stale, due], now).map((lead) => lead.id)).toEqual([stale.id, due.id]);
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

  it("selects pipeline needs-attention items by urgency and formats the admin queue", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const overdueActive = {
      ...updatePipelineLead(createPipelineLead({ ...scrapedLead, id: "google:overdue", company: "Overdue Dental", score: 90 }, "Jack"), {
        stage: "interested",
        nextAction: "Follow up on discovery",
        nextFollowUpAt: "2026-05-08T12:00:00.000Z",
      }),
      updatedAt: "2026-05-07T12:00:00.000Z",
    };
    const hotWithoutPrep = createPipelineLead({ ...scrapedLead, id: "google:hot-no-prep", company: "Hot No Prep", score: 96, website: undefined }, "Tyler");
    const missingFollowUp = updatePipelineLead(createPipelineLead({ ...scrapedLead, id: "google:missing-date", company: "Missing Date", score: 72 }, "Tyler"), {
      stage: "contacted",
      nextAction: "Wait for response",
    });

    const items = selectPipelineAttentionItems([missingFollowUp, hotWithoutPrep, overdueActive], now, 5);

    expect(items.map((item) => item.lead.company)).toEqual(["Overdue Dental", "Hot No Prep", "Missing Date"]);
    expect(items[0].reasons).toEqual(expect.arrayContaining(["stale_untouched", "overdue_active_stage"]));
    expect(items[1].reasons).toContain("hot_without_prep");
    expect(items[2].reasons).toContain("missing_follow_up");

    const brief = formatPipelineAttentionBriefForCopy([missingFollowUp, hotWithoutPrep, overdueActive], now);
    expect(brief).toContain("Liminull pipeline needs-attention queue — 2026-05-10");
    expect(brief).toContain("Overdue Dental — Jack");
    expect(brief).toContain("hot without prep");
  });

  it("returns stage-aware quick actions for moving leads through the pipeline", () => {
    const newLead = createPipelineLead(scrapedLead, "Tyler");
    const contactedLead = updatePipelineLead(newLead, { stage: "contacted" });
    const wonLead = updatePipelineLead(newLead, { stage: "closed_won" });

    expect(getLeadQuickActions(newLead).map((action) => action.label)).toEqual([
      "Mark contacted",
      "Interested",
      "No fit",
    ]);
    expect(getLeadQuickActions(contactedLead)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Discovery booked", stage: "meeting_requested", followUpInDays: 1 }),
        expect.objectContaining({ label: "Followed up", stage: "contacted", followUpInDays: 4 }),
      ])
    );
    expect(getLeadQuickActions(wonLead)).toEqual([]);
  });

  it("formats copy-ready lead briefs for quick operator handoff", () => {
    const lead = {
      ...createPipelineLead(scrapedLead, "Tyler"),
      nextFollowUpAt: "2026-05-08T12:00:00.000Z",
      notes: "Owner asked for intake examples",
    };

    const brief = formatPipelineLeadBriefForCopy(lead, new Date("2026-05-06T12:00:00.000Z"));

    expect(brief).toContain("Lead brief: Austin Automation Clinic");
    expect(brief).toContain("Owner: Tyler");
    expect(brief).toContain("Priority: HOT");
    expect(brief).toContain("Next follow-up: 2026-05-08");
    expect(brief).toContain("Notes: Owner asked for intake examples");
    expect(brief).toContain("- 4.9 stars from 145 Google reviews");
  });

  it("formats a daily pipeline brief from the active lead queue", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const staleLead = {
      ...createPipelineLead({ ...scrapedLead, id: "google:stale", website: undefined, score: 95 }, "Tyler"),
      lastTouchedAt: "2026-05-01T12:00:00.000Z",
    };
    const contactedLead = updatePipelineLead(
      createPipelineLead({ ...scrapedLead, id: "google:contacted", company: "River City Dental" }, "Jack"),
      { stage: "contacted", nextAction: "Send follow-up recap" }
    );
    const closedLead = updatePipelineLead(
      createPipelineLead({ ...scrapedLead, id: "google:closed", company: "Closed Clinic" }, "Tyler"),
      { stage: "closed_won" }
    );

    const brief = formatPipelineDailyBriefForCopy([contactedLead, closedLead, staleLead], now, 3);

    expect(brief).toContain("Liminull pipeline daily brief — 2026-05-10");
    expect(brief).toContain("Open leads: 2");
    expect(brief).toContain("- closed won: 1");
    expect(brief).toContain("- contacted: 1");
    expect(brief).toContain("1. Austin Automation Clinic");
    expect(brief).toContain("Stale follow-ups:");
    expect(brief).toContain("Austin Automation Clinic: Qualify and contact decision maker");
  });

  it("filters pipeline leads by owner, stage, no website, phone presence, hot score, stale state, and prep readiness", () => {
    const tylerHotNoWebsite = createPipelineLead({ ...scrapedLead, id: "google:tyler-hot", score: 91, website: undefined }, "Tyler");
    const jackHotWithWebsite = createPipelineLead({ ...scrapedLead, id: "google:jack-hot", score: 92 }, "Jack");
    const tylerWarmNoPhone = createPipelineLead(
      { ...scrapedLead, id: "google:tyler-warm", score: 70, phone: undefined, website: undefined },
      "Tyler"
    );
    const staleReady = {
      ...updatePipelineLead(createPipelineLead({ ...scrapedLead, id: "google:stale-ready", score: 82 }, "Tyler"), {
        salesPrepStatus: "ready",
      }),
      lastTouchedAt: "2026-05-01T12:00:00.000Z",
    };

    expect(
      filterPipelineLeads([tylerWarmNoPhone, jackHotWithWebsite, tylerHotNoWebsite], {
        owner: "Tyler",
        stage: "new_lead",
        noWebsiteOnly: true,
        hasPhoneOnly: true,
        hotScoreOnly: true,
      }).map((lead) => lead.id)
    ).toEqual([tylerHotNoWebsite.id]);

    expect(filterPipelineLeads([tylerHotNoWebsite, staleReady], { staleOnly: true }).map((lead) => lead.id)).toEqual([staleReady.id]);
    expect(filterPipelineLeads([tylerHotNoWebsite, staleReady], { prepReadyOnly: true }).map((lead) => lead.id)).toEqual([staleReady.id]);
  });

  it("lets admin view every employee's pipeline sorted by company name", () => {
    const zetaTyler = createPipelineLead({ ...scrapedLead, id: "google:zeta", company: "Zeta Dental" }, "Tyler");
    const alphaJack = createPipelineLead({ ...scrapedLead, id: "google:alpha", company: "Alpha Med Spa" }, "Jack");
    const alphaTyler = createPipelineLead({ ...scrapedLead, id: "google:alpha-tyler", company: "Alpha Med Spa" }, "Tyler");

    expect(
      filterPipelineLeads([zetaTyler, alphaTyler, alphaJack], {
        owner: undefined,
        stage: "all",
        sortBy: "company",
      }).map((lead) => `${lead.company}:${lead.owner}`)
    ).toEqual(["Alpha Med Spa:Jack", "Alpha Med Spa:Tyler", "Zeta Dental:Tyler"]);
  });

  it("builds deterministic bulk admin action patches", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");

    expect(buildPipelineBulkActionPatch("reassign", { owner: " Jack ", now })).toEqual({
      owner: "Jack",
      lastTouchedAt: "2026-05-10T12:00:00.000Z",
    });
    expect(buildPipelineBulkActionPatch("closed_lost", { now })).toEqual({
      stage: "closed_lost",
      nextAction: "Closed lost from bulk admin review",
      lastTouchedAt: "2026-05-10T12:00:00.000Z",
    });
    expect(buildPipelineBulkActionPatch("worked_today", { now, nextFollowUpInDays: 2 })).toEqual({
      nextAction: "Worked today — follow up on response",
      lastTouchedAt: "2026-05-10T12:00:00.000Z",
      nextFollowUpAt: "2026-05-12T12:00:00.000Z",
    });
  });

  it("summarizes admin pipeline health by employee name", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const tylerHotStale = {
      ...createPipelineLead({ ...scrapedLead, id: "google:tyler-hot", score: 95, website: undefined }, "Tyler"),
      lastTouchedAt: "2026-05-01T12:00:00.000Z",
      salesPrepStatus: "ready" as const,
    };
    const jackDueSoon = {
      ...createPipelineLead({ ...scrapedLead, id: "google:jack-due", score: 72 }, "Jack"),
      nextFollowUpAt: "2026-05-12T12:00:00.000Z",
    };
    const jackClosed = updatePipelineLead(
      createPipelineLead({ ...scrapedLead, id: "google:jack-closed", score: 96 }, "Jack"),
      { stage: "closed_lost" }
    );

    expect(summarizePipelineByOwner([tylerHotStale, jackDueSoon, jackClosed], now)).toEqual([
      {
        owner: "Jack",
        totalLeads: 2,
        openLeads: 1,
        hotLeads: 0,
        staleLeads: 0,
        prepReadyLeads: 0,
        dueSoonLeads: 1,
      },
      {
        owner: "Tyler",
        totalLeads: 1,
        openLeads: 1,
        hotLeads: 1,
        staleLeads: 1,
        prepReadyLeads: 1,
        dueSoonLeads: 0,
      },
    ]);
  });

  it("formats copy-ready admin employee rollups sorted by employee name", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const tylerHot = {
      ...createPipelineLead({ ...scrapedLead, id: "google:tyler-hot", score: 95, website: undefined }, "Tyler"),
      salesPrepStatus: "ready" as const,
    };
    const jackDue = {
      ...createPipelineLead({ ...scrapedLead, id: "google:jack-due", company: "River City Dental", score: 75 }, "Jack"),
      nextFollowUpAt: "2026-05-11T12:00:00.000Z",
    };

    const rollup = formatPipelineOwnerSummaryForCopy([tylerHot, jackDue], now);

    expect(rollup).toContain("Liminull employee pipeline rollup — 2026-05-10");
    expect(rollup).toContain("All employees: 2 open / 2 total · 1 hot · 0 stale · 1 prep · 1 due soon");
    expect(rollup.indexOf("- Jack:")).toBeLessThan(rollup.indexOf("- Tyler:"));
    expect(rollup).toContain("- Jack: 1 open / 1 total · 0 hot · 0 stale · 0 prep · 1 due soon");
    expect(rollup).toContain("- Tyler: 1 open / 1 total · 1 hot · 0 stale · 1 prep · 0 due soon");
  });
});
