import { LOG_SCHEMA_VERSION } from "@vl-smartlive/log-schema";
import type { SmartLiveReportLog } from "@vl-smartlive/log-schema";
import {
  collectHighlights,
  collectIssues,
  summarizeCounts,
  summarizeSession,
} from "./summarize";
import type { CreateReportInput } from "./types";

export function createReportJson(input: CreateReportInput): SmartLiveReportLog {
  const report: SmartLiveReportLog = {
    schemaVersion: LOG_SCHEMA_VERSION,
    appId: input.session.appId,
    appVersion: input.session.appVersion,
    sessionId: input.session.sessionId,
    reportId: `sl_report_${input.session.sessionId}`,
    createdAt: new Date().toISOString(),
    summary: summarizeSession(input.session),
    counts: summarizeCounts(input.comments, input.alerts),
    highlights: collectHighlights(input.comments),
    issues: collectIssues(input.comments, input.alerts),
    notes: input.notes ?? ["This report was generated locally."],
    markdownPath: "report.md",
  };

  return report;
}
