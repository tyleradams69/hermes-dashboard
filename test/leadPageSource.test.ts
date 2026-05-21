import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";

describe("lead scraper page wiring", () => {
  it("auto-loads the saved pipeline on page mount so persisted leads appear after refresh", async () => {
    const source = await readFile("src/app/leads/page.tsx", "utf8");

    expect(source).toContain("useEffect");
    expect(source).toContain("void loadPipeline();");
  });
});
