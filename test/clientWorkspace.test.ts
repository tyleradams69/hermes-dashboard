import { describe, expect, it } from "vitest";

import { buildClientWorkspaceFromPipelineLead, formatClientHandoffSummary } from "../src/lib/clientWorkspace";
import { createPipelineLead } from "../src/lib/leadPipeline";
import type { LeadRecord } from "../src/lib/leadScraper";

const leadRecord: LeadRecord = {
  id: "google:closed-won",
  company: "Austin Smile Studio",
  source: "google_places",
  location: "Austin, TX",
  niche: "AI intake automation",
  size: "local",
  aiIntent: "High",
  evidence: ["4.8 stars from 126 Google reviews", "No website attached"],
  rating: 4.8,
  reviewCount: 126,
  phone: "+1 512-555-0101",
  score: 94,
};

describe("client workspace conversion", () => {
  it("converts a closed-won pipeline lead into a client delivery workspace seed", () => {
    const pipelineLead = {
      ...createPipelineLead(leadRecord, "Tyler"),
      stage: "closed_won" as const,
      notes: "Owner wants intake automation first.",
      nextAction: "Collect intake form and booking workflow assets",
    };

    const workspace = buildClientWorkspaceFromPipelineLead(pipelineLead, new Date("2026-05-31T12:00:00.000Z"));

    expect(workspace).toMatchObject({
      id: "client-google-closed-won-tyler",
      sourceLeadId: pipelineLead.id,
      name: "Austin Smile Studio",
      phase: "handoff",
      packageFit: "AI intake automation",
      owner: "Tyler",
      nextDeliverable: "Collect intake form and booking workflow assets",
      createdAt: "2026-05-31T12:00:00.000Z",
    });
    expect(workspace.assetChecklist).toEqual(
      expect.arrayContaining(["Website/domain access or current platform login", "Current intake/contact form details"])
    );
    expect(workspace.internalNotes).toContain("Owner wants intake automation first.");
  });

  it("formats a client-safe internal handoff summary", () => {
    const pipelineLead = {
      ...createPipelineLead(leadRecord, "Tyler"),
      stage: "closed_won" as const,
      nextAction: "Collect intake form and booking workflow assets",
    };
    const workspace = buildClientWorkspaceFromPipelineLead(pipelineLead, new Date("2026-05-31T12:00:00.000Z"));
    const summary = formatClientHandoffSummary(workspace);

    expect(summary).toContain("Client workspace: Austin Smile Studio");
    expect(summary).toContain("Phase: handoff");
    expect(summary).toContain("Package/offer: AI intake automation");
    expect(summary).toContain("Next deliverable: Collect intake form and booking workflow assets");
    expect(summary).toContain("Asset checklist:");
  });
});
