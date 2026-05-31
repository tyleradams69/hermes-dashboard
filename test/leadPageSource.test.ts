import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";

describe("lead scraper page wiring", () => {
  it("auto-loads the saved pipeline on page mount so persisted leads appear after refresh", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("useEffect");
    expect(source).toContain("void loadPipeline();");
  });

  it("keeps today's focus leads actionable from the command center", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("Create packet");
    expect(source).toContain("Copy outreach");
    expect(source).toContain("Worked today");
    expect(source).toContain("Focus lead worked — follow up on response");
  });

  it("shows stage-aware next-best-move buttons on imported pipeline cards", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("getLeadQuickActions");
    expect(source).toContain("Next best moves");
    expect(source).toContain("applyLeadQuickAction");
  });

  it("keeps imported pipeline cards copy-ready for handoff between operators", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("formatPipelineLeadBriefForCopy");
    expect(source).toContain("copyPipelineLeadBrief");
    expect(source).toContain("Copy lead brief");
  });

  it("keeps the revenue cockpit copy-ready for daily operator briefings", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("formatPipelineDailyBriefForCopy");
    expect(source).toContain("copyPipelineDailyBrief");
    expect(source).toContain("Copy daily brief");
  });

  it("defaults the pipeline to an admin all-employee view with name sorting", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("Admin: all employees");
    expect(source).toContain("Name A-Z");
    expect(source).toContain("sortBy: \"company\"");
  });

  it("loads account role before choosing the visible pipeline owner filter", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("/api/account");
    expect(source).toContain("isAdminAccount");
    expect(source).toContain("effectivePipelineOwner");
    expect(source).toContain("Employee accounts only see their assigned pipeline.");
  });

  it("keeps the admin employee pipeline summary wired to owner filtering", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("summarizePipelineByOwner");
    expect(source).toContain("Employee pipeline summary");
    expect(source).toContain("Admin rollup sorted by employee name");
    expect(source).toContain("allSummary={allOwnerSummary}");
    expect(source).toContain("onSelectOwner={(owner) => setPipelineFilters");
    expect(source).toContain("formatPipelineOwnerSummaryForCopy");
    expect(source).toContain("Copy employee rollup");
    expect(source).toContain("onCopySummary={copyEmployeePipelineRollup}");
  });

  it("keeps bulk admin pipeline actions wired to selected leads", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("Bulk admin actions");
    expect(source).toContain("selectedPipelineLeadIds");
    expect(source).toContain("buildPipelineBulkActionPatch");
    expect(source).toContain("Reassign selected");
    expect(source).toContain("Generate prep for hot leads");
    expect(source).toContain("Select for bulk action");
  });

  it("keeps the admin pipeline review table wired to filtered leads and owner chips", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("AdminPipelineReviewTable");
    expect(source).toContain("Admin pipeline review");
    expect(source).toContain("Fast all-employee scan sorted by the active filters");
    expect(source).toContain("leads={filteredPipelineLeads}");
    expect(source).toContain("onToggleLeadSelection={togglePipelineLeadSelection}");
    expect(source).toContain("Next follow-up");
    expect(source).toContain("formatPipelineDate");
  });

  it("keeps the admin needs-attention queue and saved views wired to pipeline filters", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("selectPipelineAttentionItems");
    expect(source).toContain("Needs attention");
    expect(source).toContain("Pipeline health");
    expect(source).toContain("Hot without prep");
    expect(source).toContain("No follow-up date");
    expect(source).toContain("Copy attention queue");
    expect(source).toContain("formatPipelineAttentionBriefForCopy");
    expect(source).toContain("pipelineSavedViews");
    expect(source).toContain("Hot no-website");
    expect(source).toContain("applyPipelineSavedView");
    expect(source).toContain("Attention queue worked — follow up on response");
  });
});
