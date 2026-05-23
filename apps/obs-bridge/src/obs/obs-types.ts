export type ObsConnectionState = "idle" | "connecting" | "connected" | "error" | "disconnected";

export type ObsErrorState =
  | "unsupported_runtime"
  | "auth_required"
  | "auth_failed"
  | "connection_failed"
  | "request_failed";

export type ObsStreamState = "unknown" | "idle" | "live" | "recording" | "recording_live";

export type ObsConnectionConfig = {
  host: string;
  port: number;
  password?: string;
};

export type ObsMetricsSnapshot = {
  bitrateKbps?: number;
  cpuUsagePercent?: number;
  droppedFrames?: number;
  skippedFrames?: number;
  fps?: number;
};

export type ObsConnectionSnapshot = {
  connection: ObsConnectionState;
  host: string;
  port: number;
  streamState: ObsStreamState;
  currentSceneName: string;
  metrics: ObsMetricsSnapshot;
  obsVersion?: string;
  lastError?: string;
  errorState?: ObsErrorState;
  updatedAt: string;
};

export type ObsEventName =
  | "connectionChanged"
  | "streamStateChanged"
  | "sceneChanged"
  | "metricsChanged"
  | "error";

export type ObsEventHandler = (snapshot: ObsConnectionSnapshot) => void;
