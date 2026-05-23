export type ObsBridgeReportInput = {
  source: "obs-bridge";
  generatedAt: string;
  session: Record<string, unknown>;
  comments: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  streamState: Array<Record<string, unknown>>;
};

export type ObsBridgeReportPreview = {
  status: "idle" | "missing_session" | "prepared";
  jsonPreview: string;
  markdownPreview: string;
  generatedAt: string;
};

export type ObsBridgeReportPlan = {
  reportJsonTargetPath: string;
  reportMarkdownTargetPath: string;
  reportStatus: string;
  reportJsonPreview: string;
  reportMarkdownPreview: string;
  generatedAt: string;
};
