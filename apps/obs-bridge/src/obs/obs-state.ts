import type { ObsConnectionSnapshot, ObsEventName } from "./obs-types";

export function createInitialObsSnapshot(): ObsConnectionSnapshot {
  return {
    connection: "idle",
    host: "127.0.0.1",
    port: 4455,
    streamState: "unknown",
    currentSceneName: "--",
    metrics: {},
    updatedAt: new Date().toISOString(),
  };
}

export function reduceObsEvent(
  previous: ObsConnectionSnapshot,
  eventName: ObsEventName,
  next: Partial<ObsConnectionSnapshot>,
): ObsConnectionSnapshot {
  return {
    ...previous,
    ...next,
    metrics: {
      ...previous.metrics,
      ...(next.metrics ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function formatObsConnectionLabel(snapshot: ObsConnectionSnapshot): string {
  if (snapshot.connection === "connected") return "OBS接続済み";
  if (snapshot.connection === "connecting") return "OBS接続中";
  if (snapshot.connection === "error") return "OBS接続エラー";
  if (snapshot.connection === "disconnected") return "OBS切断";
  return "OBS未接続";
}

export function formatObsStreamLabel(snapshot: ObsConnectionSnapshot): string {
  if (snapshot.streamState === "live") return "配信中";
  if (snapshot.streamState === "recording") return "録画中";
  if (snapshot.streamState === "recording_live") return "配信中 + 録画中";
  if (snapshot.streamState === "idle") return "待機中";
  return "状態不明";
}
