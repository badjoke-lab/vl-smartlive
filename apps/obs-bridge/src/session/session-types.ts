export type SessionStatus = "idle" | "ready" | "active" | "ended" | "error";

export interface SessionMetadata {
  sessionId: string;
  appId: string;
  appVersion: string;
  mode: string;
  platform: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  obsClientMode: string;
  logSchemaVersion: string;
  notes?: string;
}

export interface SessionState {
  status: SessionStatus;
  session: SessionMetadata | null;
  plannedLogDirectory: string;
}
