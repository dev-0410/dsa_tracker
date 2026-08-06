import { describe, expect, it } from "vitest";
import { isStudyPlanComplete, isStudyPlanItemTerminal } from "./lifecycle";

describe("study-plan lifecycle", () => {
  it("treats completed and skipped items as terminal", () => {
    expect(isStudyPlanItemTerminal("COMPLETED")).toBe(true);
    expect(isStudyPlanItemTerminal("SKIPPED")).toBe(true);
    expect(isStudyPlanItemTerminal("TODO")).toBe(false);
    expect(isStudyPlanItemTerminal("IN_PROGRESS")).toBe(false);
  });

  it("completes only non-empty plans whose items are all terminal", () => {
    expect(isStudyPlanComplete(["COMPLETED", "SKIPPED", "COMPLETED"])).toBe(true);
    expect(isStudyPlanComplete(["COMPLETED", "IN_PROGRESS"])).toBe(false);
    expect(isStudyPlanComplete([])).toBe(false);
  });
});
