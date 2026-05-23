export const REPORT_GENERATION_STATUSES = [
  "idle",
  "needs_session",
  "needs_log_plans",
  "ready",
  "preview_ready",
  "output_ready",
  "blocked",
  "error",
] as const;

export type ReportGenerationStatus = (typeof REPORT_GENERATION_STATUSES)[number];

export type ReportGenerationSummary = {
  status: ReportGenerationStatus;
  headline: string;
  explanation: string;
  includedSections: string[];
  missingInputs: string[];
  nextActionLabel: string;
  reportJsonReady: boolean;
  reportMarkdownReady: boolean;
  generatedAt?: string;
};
