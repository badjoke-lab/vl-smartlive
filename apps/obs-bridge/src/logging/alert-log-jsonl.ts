import type { AlertLogEntry } from "./alert-log-types";

export function alertLogToJsonlLine(entry: AlertLogEntry): string {
  return `${JSON.stringify(entry)}\n`;
}

export function alertLogsToJsonl(entries: AlertLogEntry[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}
