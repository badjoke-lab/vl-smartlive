export type ObsClientMode = "mock" | "native-readonly";

export type StreamStateLogSource = "obs_ui_summary" | "obs_diagnostics" | "renderer_state";

export type BuildStreamStateLogInput = {
  sessionId?: string;
  obsClientMode: ObsClientMode | string;
  obsFlowState?: string;
  connectionState?: string;
  streamState?: string;
  sceneName?: string;
  metrics?: {
    bitrateKbps?: number;
    cpuUsagePercent?: number;
    droppedFrames?: number;
    fps?: number;
  };
  source?: StreamStateLogSource | string;
  note?: string;
  timestamp?: string;
};

export type StreamStateLogEntry = {
  sessionId: string;
  timestamp: string;
  entryId: string;
  obsClientMode: string;
  obsFlowState: string;
  connectionState: string;
  streamState: string;
  sceneName: string;
  bitrateKbps?: number;
  cpuUsagePercent?: number;
  droppedFrames?: number;
  fps?: number;
  source: string;
  note?: string;
};

export type PlannedStreamStateJsonlAppend = {
  targetPath: string;
  lineCount: number;
  preview: string;
  createdAt: string;
};

export type StreamStateLogBuildResult = {
  entries: StreamStateLogEntry[];
  skipped: number;
  warnings: string[];
};
