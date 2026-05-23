import type { ObsBridgeReportInput } from "./report-input-types";
import type { ObsBridgeReportOutputPlan } from "./report-output-types";
import { createObsBridgeReportJsonText } from "./report-output-json";
import { createObsBridgeReportMarkdownText } from "./report-output-markdown";

export function createObsBridgeReportOutputPlan(params: {
  plannedLogDirectory: string;
  input: ObsBridgeReportInput;
}): ObsBridgeReportOutputPlan {
  const reportJsonText = createObsBridgeReportJsonText(params.input);
  const reportMarkdownText = createObsBridgeReportMarkdownText(params.input);

  return {
    status: "prepared",
    generatedAt: params.input.generatedAt,
    reportJson: {
      targetPath: `${params.plannedLogDirectory}/report.json`,
      text: reportJsonText,
      charLength: reportJsonText.length,
    },
    reportMarkdown: {
      targetPath: `${params.plannedLogDirectory}/report.md`,
      text: reportMarkdownText,
      charLength: reportMarkdownText.length,
    },
    message: "Report output plan prepared (preview only, no local write).",
  };
}
