import { describe, expect, it } from "vitest";

import {
  buildClientWorkspaceFromPipelineLead,
  deriveClientWorkspaceReadiness,
  formatClientDeliveryActionPlan,
  formatClientHandoffSummary,
  selectDeliveryFocusWorkspaces,
} from "../src/lib/clientWorkspace";
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
      launchStatus: "not_started",
      assetChecklistCompleted: [],
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
    expect(summary).toContain("Launch status: not_started");
    expect(summary).toContain("Asset checklist:");
  });

  it("formats a copy-ready delivery action plan with blockers and remaining assets", () => {
    const pipelineLead = {
      ...createPipelineLead({ ...leadRecord, website: undefined }, "Tyler"),
      stage: "closed_won" as const,
      nextAction: "Collect intake form and booking workflow assets",
    };
    const workspace = {
      ...buildClientWorkspaceFromPipelineLead(pipelineLead, new Date("2026-05-31T12:00:00.000Z")),
      launchStatus: "access_needed" as const,
      assetChecklistCompleted: ["Current intake/contact form details"],
    };
    const actionPlan = formatClientDeliveryActionPlan(workspace);

    expect(actionPlan).toContain("Austin Smile Studio — delivery action plan");
    expect(actionPlan).toContain("Readiness:");
    expect(actionPlan).toContain("Immediate next step:");
    expect(actionPlan).toContain("- Launch access is still needed");
    expect(actionPlan).toContain("Remaining assets:");
    expect(actionPlan).not.toContain("- Current intake/contact form details");
  });

  it("derives client delivery readiness with blockers and next steps", () => {
    const pipelineLead = {
      ...createPipelineLead({ ...leadRecord, website: undefined }, "Tyler"),
      stage: "closed_won" as const,
    };
    const workspace = {
      ...buildClientWorkspaceFromPipelineLead(pipelineLead, new Date("2026-05-31T12:00:00.000Z")),
      launchStatus: "access_needed" as const,
      assetChecklistCompleted: [],
    };

    const readiness = deriveClientWorkspaceReadiness(workspace);

    expect(readiness.tier).toBe("blocked");
    expect(readiness.score).toBeLessThan(50);
    expect(readiness.blockers).toContain("Launch access is still needed");
    expect(readiness.blockers).toContain("Website or launch path still needs confirmation");
    expect(readiness.nextStep).toBe("Collect missing access and confirm the launch path before build work continues.");
  });

  it("selects delivery focus workspaces before launched clients", () => {
    const baseLead = {
      ...createPipelineLead(leadRecord, "Tyler"),
      stage: "closed_won" as const,
    };
    const baseWorkspace = buildClientWorkspaceFromPipelineLead(baseLead, new Date("2026-05-31T12:00:00.000Z"));
    const blocked = {
      ...baseWorkspace,
      id: "client-blocked",
      name: "Blocked Client",
      launchStatus: "access_needed" as const,
      assetChecklistCompleted: [],
    };
    const ready = {
      ...baseWorkspace,
      id: "client-ready",
      name: "Ready Client",
      phase: "review" as const,
      launchStatus: "ready_to_launch" as const,
      assetChecklistCompleted: baseWorkspace.assetChecklist,
    };
    const launched = {
      ...baseWorkspace,
      id: "client-launched",
      name: "Launched Client",
      phase: "launched" as const,
      launchStatus: "launched" as const,
      assetChecklistCompleted: baseWorkspace.assetChecklist,
    };

    const focus = selectDeliveryFocusWorkspaces([launched, ready, blocked]);

    expect(focus.map((item) => item.workspace.id)).toEqual(["client-blocked", "client-ready"]);
    expect(focus[0].readiness.tier).toBe("blocked");
    expect(focus[1].readiness.tier).toBe("launch_ready");
  });
});
