import OBSWebSocket from "obs-websocket-js";
import type {
  ObsBridgeClient,
  ObsBridgeClientMode,
  ObsBridgeClientOptions,
  ObsEventListeners,
} from "./obs-client";
import type { ObsConnectionConfig, ObsConnectionSnapshot, ObsEventName, ObsMetricsSnapshot, ObsStreamState } from "./obs-types";
import { createInitialObsSnapshot, reduceObsEvent } from "./obs-state";

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "OBS request failed";
}

function toStreamState(outputActive?: boolean, outputReconnecting?: boolean): ObsStreamState {
  if (outputActive) return "live";
  if (outputReconnecting) return "idle";
  return "idle";
}

export function createRealObsBridgeClient(
  options?: ObsBridgeClientOptions,
): ObsBridgeClient {
  const obs = new OBSWebSocket();
  const mode: ObsBridgeClientMode = options?.mode ?? "real";
  let snapshot: ObsConnectionSnapshot = createInitialObsSnapshot();
  const listeners: ObsEventListeners = new Map();

  function emit(eventName: ObsEventName, next: Partial<ObsConnectionSnapshot>) {
    snapshot = reduceObsEvent(snapshot, eventName, next);
    const handlers = listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler) => handler(snapshot));
  }

  async function readObsVersion(): Promise<Partial<ObsConnectionSnapshot>> {
    try {
      const version = await obs.call("GetVersion");
      return { obsVersion: version.obsVersion || version.obsWebSocketVersion || "unknown" };
    } catch {
      return {};
    }
  }

  async function readSafeRuntimeInfo(): Promise<Partial<ObsConnectionSnapshot>> {
    const next: Partial<ObsConnectionSnapshot> = {};

    try {
      const scene = await obs.call("GetCurrentProgramScene");
      next.currentSceneName = scene.currentProgramSceneName ?? snapshot.currentSceneName;
    } catch {
      // optional read
    }

    try {
      const status = await obs.call("GetStreamStatus");
      next.streamState = toStreamState(status.outputActive, status.outputReconnecting);
      const metrics: ObsMetricsSnapshot = {
        droppedFrames: status.outputSkippedFrames,
      };
      next.metrics = metrics;
    } catch {
      // optional read
    }

    try {
      const stats = await obs.call("GetStats");
      next.metrics = {
        ...(next.metrics ?? {}),
        cpuUsagePercent: stats.cpuUsage,
        fps: stats.activeFps,
      };
    } catch {
      // optional read
    }

    return next;
  }

  return {
    getSnapshot() {
      return snapshot;
    },

    async connect(config: ObsConnectionConfig) {
      const address = `ws://${config.host}:${config.port}`;
      emit("connectionChanged", {
        connection: "connecting",
        host: config.host,
        port: config.port,
        lastError: undefined,
      });

      try {
        await obs.connect(address, config.password ? config.password : undefined);
        const version = await readObsVersion();
        const runtime = await readSafeRuntimeInfo();
        emit("connectionChanged", {
          connection: "connected",
          ...version,
          ...runtime,
        });
      } catch (error) {
        emit("error", {
          connection: "error",
          lastError: toSafeErrorMessage(error),
        });
      }

      return snapshot;
    },

    async disconnect() {
      try {
        await obs.disconnect();
      } catch {
        // ignore disconnect errors
      }

      emit("connectionChanged", {
        connection: "disconnected",
        streamState: "unknown",
      });
      return snapshot;
    },

    async refresh() {
      if (snapshot.connection !== "connected") return snapshot;
      const version = await readObsVersion();
      const runtime = await readSafeRuntimeInfo();
      emit("metricsChanged", {
        ...version,
        ...runtime,
      });
      return snapshot;
    },

    on(eventName, handler) {
      const handlers = listeners.get(eventName) ?? new Set();
      handlers.add(handler);
      listeners.set(eventName, handlers);

      return () => {
        handlers.delete(handler);
      };
    },
    mode,
  };
}
