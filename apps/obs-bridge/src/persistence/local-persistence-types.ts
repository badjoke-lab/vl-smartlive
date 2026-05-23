export type LocalPersistenceRuntimeSupport = "supported" | "unsupported_runtime";

export type LocalPersistenceExecutionStatus =
  | "unsupported_runtime"
  | "invalid_plan"
  | "partial_failure"
  | "success";

export type LocalPersistenceOperation = {
  operationId: string;
  operationType: "mkdir" | "writeText" | "appendJsonl";
  targetPath: string;
  fileKind?:
    | "session.json"
    | "comments.jsonl"
    | "alerts.jsonl"
    | "stream-state.jsonl"
    | "report.json"
    | "report.md";
  text?: string;
};

export type LocalPersistenceExecutionInput = {
  planStatus: "ready" | "blocked" | "invalid";
  plannedSessionDirectory: string;
  validationErrors: string[];
  queue: LocalPersistenceOperation[];
};

export type LocalPersistenceOperationResult = {
  operationId: string;
  targetPath: string;
  operationType: "mkdir" | "writeText" | "appendJsonl";
  status: "written" | "appended" | "skipped" | "failed";
  errorMessage?: string;
};

export type LocalPersistenceExecutionResult = {
  status: LocalPersistenceExecutionStatus;
  runtimeSupport: LocalPersistenceRuntimeSupport;
  outputDirectory: string;
  operationResults: LocalPersistenceOperationResult[];
  errorMessages: string[];
  completedAt: string;
};
