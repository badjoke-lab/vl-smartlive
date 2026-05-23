import type { ObsBridgeReportInput } from "./report-input-types";
import type { ObsBridgeReportOutputMarkdown } from "./report-output-types";

export function buildObsBridgeReportMarkdownOutput(input: ObsBridgeReportInput): ObsBridgeReportOutputMarkdown {
  const title = "OBS Bridge Final Report (Preview Preview)";
  const sessionId = String(input.session.sessionId ?? "unknown");
  const markdown = [
    `# ${title}`,
    "",
    "## Session summary",
    `- Session ID: ${sessionId}`,
    `- Generated at: ${input.generatedAt}`,
    `- Source: ${input.source}`,
    "",
    "## Comment summary",
    `- Total comments: ${input.comments.length}`,
    "",
    "## Alert summary",
    `- Total alerts: ${input.alerts.length}`,
    "",
    "## Stream-state summary",
    `- Entries: ${input.streamState.length}`,
    "",
    "## Known limitations",
    "- Persistence preview only. No local filesystem writes are performed in this phase.",
    "- OBS integration remains mock default with native read-only diagnostics.",
    "",
    "## Local-first / no-cloud note",
    "- This preview is local-first and does not rely on cloud persistence.",
    "",
  ].join("\n");

  return { title, markdown };
}

export function createObsBridgeReportMarkdownText(input: ObsBridgeReportInput): string {
  return buildObsBridgeReportMarkdownOutput(input).markdown;
}
