import type { PlannedStreamStateJsonlAppend, StreamStateLogEntry } from "./stream-state-log-types";
import { streamStateLogsToJsonl } from "./stream-state-log-jsonl";

export function planStreamStateJsonlAppend(
  targetPath: string,
  entries: StreamStateLogEntry[],
  previewLines = 3
): PlannedStreamStateJsonlAppend {
  const lines = streamStateLogsToJsonl(entries).trimEnd().split("\n").filter(Boolean);
  return {
    targetPath,
    lineCount: entries.length,
    preview: lines.slice(0, Math.max(1, previewLines)).join("\n"),
    createdAt: new Date().toISOString(),
  };
}
