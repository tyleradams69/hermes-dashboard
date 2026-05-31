import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";

describe("dashboard smoothness guardrails", () => {
  it("keeps shell polling and clock updates lightweight", async () => {
    const source = await readFile("src/components/AppShell.tsx", "utf8");

    expect(source).toContain("document.visibilityState === \"hidden\"");
    expect(source).toContain("visibilitychange");
    expect(source).toContain("setInterval(updateClock, 30000)");
    expect(source).toContain("setInterval(() => void loadNotifications(), 30000)");
    expect(source).toContain("next/image");
  });

  it("keeps long dashboard card lists cheap to render off-screen", async () => {
    const source = await readFile("src/app/globals.css", "utf8");

    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("content-visibility: auto");
    expect(source).toContain("contain-intrinsic-size: 360px");
  });

  it("memoizes the expensive pipeline rollups around the visible lead list", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("useMemo");
    expect(source).toContain("const ownerPipelineSummaries = useMemo");
    expect(source).toContain("const attentionItems = useMemo");
    expect(source).toContain("const pipelineHealth = useMemo");
    expect(source).toContain("const selectedPipelineLeadSet = useMemo");
  });
});
