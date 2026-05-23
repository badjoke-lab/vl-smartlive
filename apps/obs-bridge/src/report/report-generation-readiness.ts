import type { ReportGenerationStatus } from "./report-generation-types";

export type ReportGenerationReadiness = {
  status: ReportGenerationStatus;
  missingInputs: string[];
  includedSections: string[];
  reportJsonReady: boolean;
  reportMarkdownReady: boolean;
};

export function getReportGenerationReadiness(input: {
  hasSession: boolean;
  sessionReady: boolean;
  commentsReady: boolean;
  alertsReady: boolean;
  streamStateReady: boolean;
  reportPreviewReady: boolean;
  reportOutputReady: boolean;
  reportJsonReady: boolean;
  reportMarkdownReady: boolean;
}): ReportGenerationReadiness {
  if (!input.hasSession) return { status: "needs_session", missingInputs: ["session"], includedSections: [], reportJsonReady: false, reportMarkdownReady: false };
  const missingInputs = [
    input.sessionReady ? null : "session",
    input.commentsReady ? null : "comments",
    input.alertsReady ? null : "alerts",
    input.streamStateReady ? null : "stream-state",
  ].filter(Boolean) as string[];
  const includedSections = ["session", "comments", "alerts", "stream-state", "report.json", "report.md"];
  if (missingInputs.length) return { status: "needs_log_plans", missingInputs, includedSections, reportJsonReady: false, reportMarkdownReady: false };
  if (input.reportOutputReady) return { status: "output_ready", missingInputs: [], includedSections, reportJsonReady: input.reportJsonReady, reportMarkdownReady: input.reportMarkdownReady };
  if (input.reportPreviewReady) return { status: "preview_ready", missingInputs: [], includedSections, reportJsonReady: input.reportJsonReady, reportMarkdownReady: input.reportMarkdownReady };
  return { status: "ready", missingInputs: [], includedSections, reportJsonReady: false, reportMarkdownReady: false };
}
