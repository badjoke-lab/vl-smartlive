import type { SmartLiveCommentLog } from "@vl-smartlive/log-schema";
import type { PlannedCommentJsonlAppend } from "./comment-log-types";
import { commentLogsToJsonl } from "./comment-log-jsonl";

export function planCommentJsonlAppend(targetPath: string, entries: SmartLiveCommentLog[], previewLines = 3): PlannedCommentJsonlAppend {
  const lines = commentLogsToJsonl(entries).trimEnd().split("\n").filter(Boolean);
  return {
    targetPath,
    lineCount: entries.length,
    preview: lines.slice(0, Math.max(1, previewLines)).join("\n"),
    createdAt: new Date().toISOString(),
  };
}
