import { LOCAL_WRITE_FILE_KINDS, type LocalWriteBoundaryPlan, type LocalWriteValidationError } from "./local-write-types";

export function validateLocalWriteBoundaryPlan(plan: LocalWriteBoundaryPlan): LocalWriteValidationError[] {
  const errors: LocalWriteValidationError[] = [];
  if (!plan.sessionId) errors.push({ code: "missing_session_id", message: "Session id is required." });
  for (const op of plan.operations) {
    if (!LOCAL_WRITE_FILE_KINDS.includes(op.fileKind)) errors.push({ code: "invalid_file_kind", message: "Unsupported file kind.", path: op.targetPath });
    if (!op.text) errors.push({ code: "missing_text", message: "Payload text is required.", path: op.targetPath });
    if (op.targetPath.includes("..")) errors.push({ code: "path_traversal", message: "Path traversal is not allowed.", path: op.targetPath });
    if (op.targetPath.startsWith("/") || /^[A-Za-z]:\\/.test(op.targetPath)) errors.push({ code: "unsafe_absolute_path", message: "Absolute path is not allowed.", path: op.targetPath });
    if (!op.targetPath.startsWith(`${plan.plannedSessionDirectory}/`)) errors.push({ code: "outside_session_directory", message: "Path must remain under planned session directory.", path: op.targetPath });
    if (op.operationType === "appendJsonl" && op.lineCount === 0) errors.push({ code: "empty_jsonl", message: "JSONL append requires non-empty lines.", path: op.targetPath });
  }
  return errors;
}
