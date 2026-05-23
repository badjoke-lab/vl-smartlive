import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectLocalPersistenceRuntimeSupport } from "./local-persistence-runtime";
import type {
  LocalPersistenceExecutionInput,
  LocalPersistenceExecutionResult,
  LocalPersistenceOperationResult,
} from "./local-persistence-types";

function isPathWithinSessionDirectory(targetPath: string, plannedSessionDirectory: string) {
  const normalizedDir = path.resolve(plannedSessionDirectory);
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget === normalizedDir || normalizedTarget.startsWith(`${normalizedDir}${path.sep}`);
}

export async function executeLocalPersistenceBoundary(input: LocalPersistenceExecutionInput): Promise<LocalPersistenceExecutionResult> {
  const runtimeSupport = await detectLocalPersistenceRuntimeSupport();
  const completedAt = new Date().toISOString();

  if (runtimeSupport !== "supported") {
    return {
      status: "unsupported_runtime",
      runtimeSupport,
      outputDirectory: input.plannedSessionDirectory,
      operationResults: [],
      errorMessages: ["Local file writing requires a supported desktop runtime."],
      completedAt,
    };
  }

  if (input.planStatus !== "ready" || input.validationErrors.length > 0) {
    return {
      status: "invalid_plan",
      runtimeSupport,
      outputDirectory: input.plannedSessionDirectory,
      operationResults: input.queue.map((op) => ({ operationId: op.operationId, targetPath: op.targetPath, operationType: op.operationType, status: "skipped" })),
      errorMessages: input.validationErrors.length ? input.validationErrors : ["Local write boundary plan is not ready."],
      completedAt,
    };
  }

  const operationResults: LocalPersistenceOperationResult[] = [];
  const errorMessages: string[] = [];

  for (const operation of input.queue) {
    if (!isPathWithinSessionDirectory(operation.targetPath, input.plannedSessionDirectory)) {
      operationResults.push({ operationId: operation.operationId, targetPath: operation.targetPath, operationType: operation.operationType, status: "failed", errorMessage: "Blocked write outside planned session directory." });
      errorMessages.push(`Blocked write outside planned session directory: ${operation.targetPath}`);
      continue;
    }

    try {
      if (operation.operationType === "mkdir") {
        await mkdir(operation.targetPath, { recursive: true });
        operationResults.push({ operationId: operation.operationId, targetPath: operation.targetPath, operationType: operation.operationType, status: "written" });
      } else if (operation.operationType === "writeText") {
        await writeFile(operation.targetPath, operation.text ?? "", "utf8");
        operationResults.push({ operationId: operation.operationId, targetPath: operation.targetPath, operationType: operation.operationType, status: "written" });
      } else {
        await appendFile(operation.targetPath, operation.text ?? "", "utf8");
        operationResults.push({ operationId: operation.operationId, targetPath: operation.targetPath, operationType: operation.operationType, status: "appended" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown write error.";
      operationResults.push({ operationId: operation.operationId, targetPath: operation.targetPath, operationType: operation.operationType, status: "failed", errorMessage });
      errorMessages.push(`Operation failed for ${operation.targetPath}: ${errorMessage}`);
    }
  }

  return {
    status: errorMessages.length ? "partial_failure" : "success",
    runtimeSupport,
    outputDirectory: input.plannedSessionDirectory,
    operationResults,
    errorMessages,
    completedAt,
  };
}
