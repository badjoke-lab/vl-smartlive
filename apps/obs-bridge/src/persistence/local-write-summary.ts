import type { LocalWriteBoundaryPlan } from "./local-write-types";

export function summarizeLocalWriteBoundaryPlan(plan: LocalWriteBoundaryPlan) {
  const plannedFiles = plan.operations.map((entry) => entry.fileKind);
  const totalCharacters = plan.operations.reduce((total, entry) => total + entry.text.length, 0);
  const blockedReason = plan.validationErrors[0]?.message ?? "";
  const nextStepLabel = plan.status === "ready" ? "Await runtime-backed persistence boundary" : "Resolve validation blockers";
  return {
    status: plan.status,
    operationCount: plan.operations.length,
    plannedFiles,
    totalCharacters,
    blockedReason,
    nextStepLabel,
  };
}
