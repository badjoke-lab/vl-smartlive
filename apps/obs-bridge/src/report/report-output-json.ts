import type { ObsBridgeReportInput } from "./report-input-types";
import type { ObsBridgeReportOutputJsonDocument } from "./report-output-types";

export function buildObsBridgeReportJsonOutput(input: ObsBridgeReportInput): ObsBridgeReportOutputJsonDocument {
  const sessionId = String(input.session.sessionId ?? "unknown");
  const appId = String(input.session.appId ?? "smartlive.obs-bridge");
  const appVersion = String(input.session.appVersion ?? "0.0.0");
  const knownLimitations = [
    "Persistence preview only: no filesystem writes are executed in this phase.",
    "OBS adapter remains mock-first with native read-only diagnostics.",
  ];

  return {
    sessionId,
    generatedAt: input.generatedAt,
    appId,
    appVersion,
    source: input.source,
    summary: {
      comments: input.comments.length,
      alerts: input.alerts.length,
      streamStateEntries: input.streamState.length,
    },
    commentsSummary: {
      total: input.comments.length,
      sampleCommentIds: input.comments.slice(0, 3).map((item) => item.commentId ?? "unknown"),
    },
    alertsSummary: {
      total: input.alerts.length,
      levels: input.alerts.reduce<Record<string, number>>((acc, item) => {
        const key = String(item.severity ?? "info");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    },
    streamStateSummary: {
      total: input.streamState.length,
      latestFlowState: String(input.streamState[0]?.obsFlowState ?? "unknown"),
    },
    limitations: knownLimitations,
    localFirst: true,
  };
}

export function createObsBridgeReportJsonText(input: ObsBridgeReportInput): string {
  return `${JSON.stringify(buildObsBridgeReportJsonOutput(input), null, 2)}\n`;
}
