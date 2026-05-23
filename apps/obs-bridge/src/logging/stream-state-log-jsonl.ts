import type { StreamStateLogEntry } from "./stream-state-log-types";

export function streamStateLogToJsonlLine(entry: StreamStateLogEntry): string {
  return `${JSON.stringify(entry)}\n`;
}

export function streamStateLogsToJsonl(entries: StreamStateLogEntry[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}
