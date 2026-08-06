import type { StudyPlanItemStatus } from "./types";

export const TERMINAL_STUDY_PLAN_ITEM_STATUSES = ["COMPLETED", "SKIPPED"] as const satisfies readonly StudyPlanItemStatus[];

export function isStudyPlanItemTerminal(status: StudyPlanItemStatus) {
  return TERMINAL_STUDY_PLAN_ITEM_STATUSES.includes(
    status as (typeof TERMINAL_STUDY_PLAN_ITEM_STATUSES)[number],
  );
}

export function isStudyPlanComplete(statuses: readonly StudyPlanItemStatus[]) {
  return statuses.length > 0 && statuses.every(isStudyPlanItemTerminal);
}
