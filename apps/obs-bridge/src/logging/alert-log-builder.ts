import type {
  AlertLogBuildResult,
  AlertLogEntry,
  BuildAlertLogsInput,
  RendererAlertInput,
} from "./alert-log-types";

function toIsoTimestamp(alert: RendererAlertInput, fallbackIso: string): string {
  if (alert.timestamp && !Number.isNaN(Date.parse(alert.timestamp))) return new Date(alert.timestamp).toISOString();
  return fallbackIso;
}

function createAlertId(index: number, timestampIso: string): string {
  const compactTs = timestampIso.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `alert_${compactTs}_${String(index + 1).padStart(4, "0")}`;
}

export function buildAlertLogs(input: BuildAlertLogsInput): AlertLogBuildResult {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const warnings: string[] = [];

  const entries: AlertLogEntry[] = input.alerts
    .filter((alert) => {
      if (!alert.message || !alert.source) {
        warnings.push("skipped alert due to missing message/source");
        return false;
      }
      return true;
    })
    .map((alert, index) => {
      const timestamp = toIsoTimestamp(alert, createdAt);
      const alertId = alert.alertId && alert.alertId.trim() ? alert.alertId : createAlertId(index, timestamp);
      return {
        sessionId: input.sessionId,
        timestamp,
        alertId,
        category: alert.category,
        severity: alert.severity,
        message: alert.message,
        source: alert.source,
        ...(alert.relatedCommentId ? { relatedCommentId: alert.relatedCommentId } : {}),
        ...(input.obsClientMode ? { obsClientMode: input.obsClientMode } : {}),
        ...(input.obsFlowState ? { obsFlowState: input.obsFlowState } : {}),
        ...(typeof alert.handled === "boolean" ? { handled: alert.handled } : {}),
      };
    });

  return { entries, skipped: input.alerts.length - entries.length, warnings };
}
