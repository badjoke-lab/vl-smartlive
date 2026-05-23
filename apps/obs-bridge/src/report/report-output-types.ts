export type ObsBridgeReportOutputJsonDocument = {
  sessionId: string;
  generatedAt: string;
  appId: string;
  appVersion: string;
  source: string;
  summary: {
    comments: number;
    alerts: number;
    streamStateEntries: number;
  };
  commentsSummary: Record<string, unknown>;
  alertsSummary: Record<string, unknown>;
  streamStateSummary: Record<string, unknown>;
  limitations: string[];
  localFirst: true;
};

export type ObsBridgeReportOutputMarkdown = {
  title: string;
  markdown: string;
};

export type PlannedReportWrite = {
  targetPath: string;
  text: string;
  charLength: number;
};

export type ObsBridgeReportOutputPlan = {
  status: "idle" | "missing_session" | "prepared";
  generatedAt: string;
  reportJson: PlannedReportWrite;
  reportMarkdown: PlannedReportWrite;
  message: string;
};
