import { describe, expect, it } from "vitest";

import {
  buildFeedbackMailto,
  buildOnboardingChecklist,
  defaultWorkspaceSettings,
  getClientNotesKey,
  parseWorkspaceSettings,
  serializeWorkspaceSettings,
} from "../src/lib/pilotWorkspace";

describe("pilot workspace helpers", () => {
  it("serializes and parses persisted workspace settings with defaults", () => {
    const serialized = serializeWorkspaceSettings({
      notifications: false,
      supervision: "semi_autonomous",
      weeklyDigest: true,
    });

    expect(parseWorkspaceSettings(serialized)).toEqual({
      notifications: false,
      supervision: "semi_autonomous",
      weeklyDigest: true,
    });

    expect(parseWorkspaceSettings("not json")).toEqual(defaultWorkspaceSettings);
    expect(parseWorkspaceSettings(null)).toEqual(defaultWorkspaceSettings);
  });

  it("builds client-specific local notes keys safely", () => {
    expect(getClientNotesKey("Demo Law Firm")).toBe("liminull:client-notes:demo-law-firm");
    expect(getClientNotesKey("  ")).toBe("liminull:client-notes:default");
  });

  it("builds an onboarding checklist from readiness data", () => {
    const checklist = buildOnboardingChecklist({
      hasBusiness: true,
      hasSettings: false,
      hasIntegrations: true,
      hasActivity: false,
    });

    expect(checklist.map((item) => [item.id, item.complete])).toEqual([
      ["business", true],
      ["settings", false],
      ["integrations", true],
      ["activity", false],
    ]);
    expect(checklist.filter((item) => item.complete)).toHaveLength(2);
  });

  it("builds feedback mailto links with context", () => {
    const href = buildFeedbackMailto({
      businessId: "demo-law-firm",
      page: "/operations",
      email: "lab@liminullai.com",
    });

    expect(href).toContain("mailto:lab@liminullai.com");
    expect(decodeURIComponent(href)).toContain("business: demo-law-firm");
    expect(decodeURIComponent(href)).toContain("page: /operations");
  });
});
