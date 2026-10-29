import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_STAGE } from "@/lib/demo-stage";

describe("livestream checkpoint indicator", () => {
  it("displays the source snapshot's tag and capability in the chat header", () => {
    const page = readFileSync("src/app/page.tsx", "utf8");
    expect(page).toContain('aria-label="Current livestream checkpoint"');
    expect(page).toContain("{DEMO_STAGE.tag}");
    expect(page).toContain("{DEMO_STAGE.label}");
    expect(DEMO_STAGE.tag).toBeTruthy();
    expect(DEMO_STAGE.label).toBeTruthy();
  });
});
