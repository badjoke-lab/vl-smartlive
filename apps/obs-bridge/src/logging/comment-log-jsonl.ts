import type { SmartLiveCommentLog } from "@vl-smartlive/log-schema";

export function commentLogToJsonlLine(entry: SmartLiveCommentLog): string {
  return `${JSON.stringify(entry)}\n`;
}

export function commentLogsToJsonl(entries: SmartLiveCommentLog[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}
