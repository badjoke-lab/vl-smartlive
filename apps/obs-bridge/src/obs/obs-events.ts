import type { ObsConnectionSnapshot } from "./obs-types";
import { formatObsConnectionLabel, formatObsStreamLabel } from "./obs-state";

export type ObsUiStatus = {
  connectionLabel: string;
  streamLabel: string;
  sceneLabel: string;
  bitrateLabel: string;
  cpuLabel: string;
  dropLabel: string;
  fpsLabel: string;
};

export function createObsUiStatus(snapshot: ObsConnectionSnapshot): ObsUiStatus {
  return {
    connectionLabel: formatObsConnectionLabel(snapshot),
    streamLabel: formatObsStreamLabel(snapshot),
    sceneLabel: snapshot.currentSceneName || "--",
    bitrateLabel: snapshot.metrics.bitrateKbps ? `${snapshot.metrics.bitrateKbps} kbps` : "unavailable",
    cpuLabel: snapshot.metrics.cpuUsagePercent ? `${snapshot.metrics.cpuUsagePercent}%` : "unavailable",
    dropLabel: String(snapshot.metrics.droppedFrames ?? 0),
    fpsLabel: snapshot.metrics.fps ? String(snapshot.metrics.fps) : "unavailable",
  };
}

export function createObsAlertMessages(snapshot: ObsConnectionSnapshot): string[] {
  const alerts: string[] = [];

  if (snapshot.connection === "error") {
    alerts.push(snapshot.lastError || "OBS接続エラーがあります");
  }

  if (snapshot.connection === "disconnected") {
    alerts.push("OBSが切断されています");
  }

  if ((snapshot.metrics.droppedFrames ?? 0) > 0) {
    alerts.push("Dropped framesが発生しています");
  }

  return alerts;
}
