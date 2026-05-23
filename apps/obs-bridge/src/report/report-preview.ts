import type { ObsBridgeReportInput, ObsBridgeReportPreview } from "./report-input-types";
import { createObsBridgeReportJsonText } from "./report-output-json";
import { createObsBridgeReportMarkdownText } from "./report-output-markdown";

export function createObsBridgeReportPreview(input: ObsBridgeReportInput): ObsBridgeReportPreview {
  return {
    status: "prepared",
    generatedAt: input.generatedAt,
    jsonPreview: createObsBridgeReportJsonText(input),
    markdownPreview: createObsBridgeReportMarkdownText(input),
  };
}
