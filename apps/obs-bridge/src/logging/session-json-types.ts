export interface SessionJsonDocument {
  sessionId: string;
  appId: string;
  appVersion: string;
  mode: string;
  platform: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  obsClientMode: string;
  logSchemaVersion: string;
  plannedFiles: {
    session: string;
    comments: string;
    alerts: string;
    streamState: string;
    reportJson: string;
    reportMarkdown: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PlannedSessionJsonWrite {
  targetPath: string;
  preview: string;
  createdAt: string;
  charLength: number;
}

export interface SessionJsonBuildResult {
  document: SessionJsonDocument;
  warnings: string[];
}
