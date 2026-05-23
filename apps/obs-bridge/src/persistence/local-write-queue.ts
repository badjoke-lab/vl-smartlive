import type { LocalWriteBoundaryPlan } from "./local-write-types";

const ORDER = ["session.json", "comments.jsonl", "alerts.jsonl", "stream-state.jsonl", "report.json", "report.md"];

export function buildLocalWriteQueue(plan: LocalWriteBoundaryPlan) {
  const ordered = [...plan.operations].sort((a, b) => ORDER.indexOf(a.fileKind) - ORDER.indexOf(b.fileKind));
  return [
    `create_dir:${plan.plannedSessionDirectory}`,
    ...ordered.map((entry) => `${entry.operationType}:${entry.targetPath}`),
  ];
}
