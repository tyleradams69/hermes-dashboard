import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";

describe("settings page source guardrails", () => {
  it("keeps team role/status badges readable on light pastel cards", async () => {
    const source = await readFile("src/app/settings/page.tsx", "utf8");

    expect(source).toContain("text-blue-700");
    expect(source).toContain("text-violet-800");
    expect(source).toContain("text-emerald-800");
    expect(source).not.toContain("uppercase text-cyan-100");
    expect(source).not.toContain("uppercase text-violet-100");
    expect(source).not.toContain("uppercase text-emerald-100");
  });

  it("exposes an admin add-employee form wired to the team API", async () => {
    const source = await readFile("src/app/settings/page.tsx", "utf8");

    expect(source).toContain("Add employee");
    expect(source).toContain("Creates a Supabase Auth user");
    expect(source).toContain("Save or copy this password before sharing it");
    expect(source).toContain("Copy temp password");
    expect(source).toContain("navigator.clipboard.writeText");
    expect(source).toContain("async function createTeamAccount");
    expect(source).toContain("method: \"POST\"");
    expect(source).toContain("/api/team");
  });
});
