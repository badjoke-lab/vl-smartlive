import type { LocalWriteBoundaryPlan, LocalWriteBoundaryStatus, LocalWriteOperation } from "./local-write-types";

export function buildLocalWriteBoundaryPlan(params: {
  sessionId: string;
  plannedSessionDirectory: string;
  status?: LocalWriteBoundaryStatus;
  operations: LocalWriteOperation[];
  validationErrors?: LocalWriteBoundaryPlan["validationErrors"];
}): LocalWriteBoundaryPlan {
  return {
    sessionId: params.sessionId,
    plannedSessionDirectory: params.plannedSessionDirectory,
    status: params.status ?? "ready",
    operations: params.operations,
    validationErrors: params.validationErrors ?? [],
    createdAt: new Date().toISOString(),
  };
}
