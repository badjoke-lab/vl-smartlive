import type { LocalPersistenceExecutionResult } from "./local-persistence-types";

export function summarizeLocalPersistenceResult(result: LocalPersistenceExecutionResult) {
  const filesWritten = result.operationResults.filter((item) => item.status === "written").length;
  const appendOperations = result.operationResults.filter((item) => item.status === "appended").length;
  const failedOperations = result.operationResults.filter((item) => item.status === "failed").length;
  const skippedOperations = result.operationResults.filter((item) => item.status === "skipped").length;

  return {
    status: result.status,
    filesWritten,
    appendOperations,
    failedOperations,
    skippedOperations,
    outputDirectory: result.outputDirectory,
    errorMessages: result.errorMessages,
    completedAt: result.completedAt,
  };
}
