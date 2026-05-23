export const LOCAL_WRITE_FILE_KINDS = [
  "session.json",
  "comments.jsonl",
  "alerts.jsonl",
  "stream-state.jsonl",
  "report.json",
  "report.md",
] as const;

export type LocalWriteFileKind = (typeof LOCAL_WRITE_FILE_KINDS)[number];
export type LocalWriteOperationType = "writeText" | "appendJsonl";
export type LocalWriteBoundaryStatus = "ready" | "blocked" | "invalid" | "unsupported_runtime";

export type LocalWriteValidationError = {
  code: string;
  message: string;
  path?: string;
};

export type LocalWriteOperation = {
  operationId: string;
  fileKind: LocalWriteFileKind;
  operationType: LocalWriteOperationType;
  targetPath: string;
  text: string;
  lineCount?: number;
};

export type LocalWriteBoundaryPlan = {
  sessionId: string;
  plannedSessionDirectory: string;
  status: LocalWriteBoundaryStatus;
  operations: LocalWriteOperation[];
  validationErrors: LocalWriteValidationError[];
  createdAt: string;
};
