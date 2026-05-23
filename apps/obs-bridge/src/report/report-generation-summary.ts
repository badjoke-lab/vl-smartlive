import type { ReportGenerationReadiness } from "./report-generation-readiness";
import type { ReportGenerationSummary } from "./report-generation-types";

export function createReportGenerationSummary(readiness: ReportGenerationReadiness, generatedAt?: string): ReportGenerationSummary {
  const byStatus: Record<string, Omit<ReportGenerationSummary, "status" | "includedSections" | "missingInputs" | "reportJsonReady" | "reportMarkdownReady" | "generatedAt">> = {
    needs_session: { headline: "Start session first.", explanation: "Report generation requires session metadata before preview/output planning.", nextActionLabel: "Start session first" },
    needs_log_plans: { headline: "Prepare log plans first.", explanation: "Report generation needs session/comments/alerts/stream-state plans.", nextActionLabel: "Prepare missing log plans" },
    ready: { headline: "Ready to prepare report preview.", explanation: "All required report inputs are prepared.", nextActionLabel: "Prepare report output plan" },
    preview_ready: { headline: "Report preview is ready.", explanation: "Preview is prepared. Next step is local-save boundary and output persistence flow.", nextActionLabel: "Prepare local write boundary plan" },
    output_ready: { headline: "Report output is ready.", explanation: "report.json and report.md previews are ready for local persistence planning.", nextActionLabel: "Save local logs when boundary is ready" },
    blocked: { headline: "Report generation is blocked.", explanation: "Resolve blocked inputs and retry report preparation.", nextActionLabel: "Resolve blocked state" },
    error: { headline: "Report generation error.", explanation: "Check previews and retry report generation.", nextActionLabel: "Retry report generation" },
    idle: { headline: "Report generation is idle.", explanation: "Start session and prepare plans to begin report generation.", nextActionLabel: "Start session" },
  };
  const base = byStatus[readiness.status] ?? byStatus.idle;
  return {
    status: readiness.status,
    ...base,
    includedSections: readiness.includedSections,
    missingInputs: readiness.missingInputs,
    nextActionLabel: base.nextActionLabel,
    reportJsonReady: readiness.reportJsonReady,
    reportMarkdownReady: readiness.reportMarkdownReady,
    ...(generatedAt ? { generatedAt } : {}),
  };
}
