export * from "./types";
export * from "./duration";
export * from "./summarize";
export * from "./json";
export * from "./markdown";

import type { ReportEngineResult, CreateReportInput } from "./types";
import { createReportJson } from "./json";
import { createReportMarkdown } from "./markdown";

export function createReport(input: CreateReportInput): ReportEngineResult {
  const report = createReportJson(input);
  const markdown = createReportMarkdown(report);

  return { report, markdown };
}
