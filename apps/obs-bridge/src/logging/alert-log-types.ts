export type AlertCategory =
  | "obs_connection"
  | "obs_runtime"
  | "obs_metrics"
  | "comment_audio"
  | "comment_video"
  | "comment_safety"
  | "session"
  | "system";

export type AlertSeverity = "info" | "warning" | "error";

export type RendererAlertInput = {
  alertId?: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  source: string;
  timestamp?: string;
  relatedCommentId?: string;
  handled?: boolean;
};

export type AlertLogEntry = {
  sessionId: string;
  timestamp: string;
  alertId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  source: string;
  relatedCommentId?: string;
  obsClientMode?: string;
  obsFlowState?: string;
  handled?: boolean;
};

export type PlannedAlertJsonlAppend = {
  targetPath: string;
  lineCount: number;
  preview: string;
  createdAt: string;
};

export type BuildAlertLogsInput = {
  sessionId: string;
  alerts: RendererAlertInput[];
  obsClientMode?: string;
  obsFlowState?: string;
  createdAt?: string;
};

export type AlertLogBuildResult = {
  entries: AlertLogEntry[];
  skipped: number;
  warnings: string[];
};
