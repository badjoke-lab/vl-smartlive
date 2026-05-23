import type { SmartLiveReportLog } from "@vl-smartlive/log-schema";
import { formatDuration } from "./duration";

function lineItems(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function createReportMarkdown(report: SmartLiveReportLog): string {
  const lines: string[] = [];

  lines.push("# SmartLive 配信レポート");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(lineItems([
    `App: ${report.appId} ${report.appVersion}`,
    `Session: ${report.sessionId}`,
    `Platform: ${report.summary.platform}`,
    `Mode: ${report.summary.mode}`,
    `Duration: ${formatDuration(report.summary.durationSec)}`,
  ]));

  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(lineItems([
    `Comments: ${report.counts.commentsTotal}`,
    `Questions: ${report.counts.questionsTotal}`,
    `Audio issues: ${report.counts.audioIssuesTotal}`,
    `Video issues: ${report.counts.videoIssuesTotal}`,
    `Held comments: ${report.counts.dangerHeldTotal}`,
    `Alerts: ${report.counts.alertsTotal}`,
    `Highlights: ${report.counts.highlightsTotal}`,
  ]));

  lines.push("");
  lines.push("## Issues");
  lines.push("");
  if (report.issues.length) {
    lines.push(lineItems(report.issues.map((issue) => `${issue.message} (${issue.count})`)));
  } else {
    lines.push("- No major issues detected from local logs.");
  }

  lines.push("");
  lines.push("## Highlights");
  lines.push("");
  if (report.highlights.length) {
    lines.push(lineItems(report.highlights.map((highlight) => highlight.text)));
  } else {
    lines.push("- No highlights detected.");
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(lineItems(report.notes.length ? report.notes : ["This report was generated locally."]));
  lines.push("");

  return lines.join("\n");
}
