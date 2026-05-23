import type { BuildStreamStateLogInput, StreamStateLogBuildResult, StreamStateLogEntry } from "./stream-state-log-types";

function toIsoTimestamp(timestamp?: string): string {
  if (timestamp && !Number.isNaN(Date.parse(timestamp))) return new Date(timestamp).toISOString();
  return new Date().toISOString();
}

function createEntryId(timestampIso: string, index = 0): string {
  const compactTs = timestampIso.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `stream_state_${compactTs}_${String(index + 1).padStart(4, "0")}`;
}

function shouldIncludeMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildStreamStateLogs(input: BuildStreamStateLogInput): StreamStateLogBuildResult {
  const warnings: string[] = [];
  const timestamp = toIsoTimestamp(input.timestamp);

  const sessionId = input.sessionId?.trim() || "session_unavailable";
  if (!input.sessionId?.trim()) warnings.push("missing session id; using session_unavailable");

  const entry: StreamStateLogEntry = {
    sessionId,
    timestamp,
    entryId: createEntryId(timestamp),
    obsClientMode: String(input.obsClientMode || "mock"),
    obsFlowState: String(input.obsFlowState || "unknown"),
    connectionState: String(input.connectionState || "unknown"),
    streamState: String(input.streamState || "unknown"),
    sceneName: String(input.sceneName || "--"),
    source: String(input.source || "renderer_state"),
    ...(input.note ? { note: input.note } : {}),
  };

  if (shouldIncludeMetric(input.metrics?.bitrateKbps)) entry.bitrateKbps = input.metrics.bitrateKbps;
  if (shouldIncludeMetric(input.metrics?.cpuUsagePercent)) entry.cpuUsagePercent = input.metrics.cpuUsagePercent;
  if (shouldIncludeMetric(input.metrics?.droppedFrames)) entry.droppedFrames = input.metrics.droppedFrames;
  if (shouldIncludeMetric(input.metrics?.fps)) entry.fps = input.metrics.fps;

  if (input.obsClientMode === "native-readonly") {
    const unavailableState = new Set(["unsupported_runtime", "request_failed", "disconnected"]);
    if (unavailableState.has(entry.obsFlowState) || unavailableState.has(entry.connectionState)) {
      delete entry.bitrateKbps;
      delete entry.cpuUsagePercent;
      delete entry.droppedFrames;
      delete entry.fps;
    }
  }

  return { entries: [entry], skipped: 0, warnings };
}
