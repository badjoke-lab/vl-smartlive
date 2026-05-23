import type { ObsBridgeReportPlan, ObsBridgeReportPreview } from "./report-input-types";

export function createObsBridgeReportPlan(params: {
  plannedLogDirectory: string;
  preview: ObsBridgeReportPreview;
}): ObsBridgeReportPlan {
  return {
    reportJsonTargetPath: `${params.plannedLogDirectory}/report.json`,
    reportMarkdownTargetPath: `${params.plannedLogDirectory}/report.md`,
    reportStatus: params.preview.status,
    reportJsonPreview: params.preview.jsonPreview,
    reportMarkdownPreview: params.preview.markdownPreview,
    generatedAt: params.preview.generatedAt,
  };
}
