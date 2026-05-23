import type { AlertLogEntry, PlannedAlertJsonlAppend } from "./alert-log-types";
import { alertLogsToJsonl } from "./alert-log-jsonl";

export function planAlertJsonlAppend(targetPath: string, entries: AlertLogEntry[], previewLines = 3): PlannedAlertJsonlAppend {
  const lines = alertLogsToJsonl(entries).trimEnd().split("\n").filter(Boolean);
  return {
    targetPath,
    lineCount: entries.length,
    preview: lines.slice(0, Math.max(1, previewLines)).join("\n"),
    createdAt: new Date().toISOString(),
  };
}
