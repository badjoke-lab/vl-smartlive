import type {
  ObsConnectionConfig,
  ObsConnectionSnapshot,
  ObsConnectionState,
  ObsEventHandler,
  ObsEventName,
  ObsMetricsSnapshot,
  ObsStreamState,
} from "./obs-types";
import { createInitialObsSnapshot, reduceObsEvent } from "./obs-state";
import { createRealObsBridgeClient } from "./obs-real-client";
import { createNativeReadonlyObsBridgeClient } from "./obs-native-client";

export const OBS_CLIENT_MODE = "mock" as const;

export type ObsBridgeClientMode = "mock" | "native-readonly" | "real";

export type ObsBridgeClient = {
  mode: ObsBridgeClientMode;
  getSnapshot(): ObsConnectionSnapshot;
  connect(config: ObsConnectionConfig): Promise<ObsConnectionSnapshot>;
  disconnect(): Promise<ObsConnectionSnapshot>;
  refresh(): Promise<ObsConnectionSnapshot>;
  on(eventName: ObsEventName, handler: ObsEventHandler): () => void;
};

export type ObsEventListeners = Map<ObsEventName, Set<ObsEventHandler>>;

export type ObsBridgeClientOptions = {
  mode?: ObsBridgeClientMode;
};

export type ObsBridgeMockState = {
  connection: ObsConnectionState;
  streaming: boolean;
  currentSceneName: string;
};

export const mockObsState: ObsBridgeMockState = {
  connection: "connected",
  streaming: true,
  currentSceneName: "Main",
};

export function createObsBridgeClient(mode: ObsBridgeClientMode = OBS_CLIENT_MODE): ObsBridgeClient {
  if (mode === "real") return createRealObsBridgeClient({ mode });
  if (mode === "native-readonly") return createNativeReadonlyObsBridgeClient();
  return createMockObsBridgeClient({});
}

export function createMockObsBridgeClient(initial?: Partial<ObsConnectionSnapshot>): ObsBridgeClient {
  let snapshot: ObsConnectionSnapshot = {
    ...createInitialObsSnapshot(),
    ...initial,
    metrics: {
      ...createInitialObsSnapshot().metrics,
      ...(initial?.metrics ?? {}),
    },
  };

  const listeners: ObsEventListeners = new Map();

  function emit(eventName: ObsEventName, next: Partial<ObsConnectionSnapshot>) {
    snapshot = reduceObsEvent(snapshot, eventName, next);
    const handlers = listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler) => handler(snapshot));
  }

  return {
    mode: "mock",
    getSnapshot() {
      return snapshot;
    },

    async connect(config: ObsConnectionConfig) {
      emit("connectionChanged", {
        connection: "connecting",
        host: config.host,
        port: config.port,
        lastError: undefined,
      });

      emit("connectionChanged", {
        connection: "connected",
        host: config.host,
        port: config.port,
        currentSceneName: snapshot.currentSceneName || "Main",
        streamState: snapshot.streamState === "unknown" ? "idle" : snapshot.streamState,
      });

      return snapshot;
    },

    async disconnect() {
      emit("connectionChanged", {
        connection: "disconnected",
        streamState: "unknown",
      });
      return snapshot;
    },

    async refresh() {
      emit("metricsChanged", {
        metrics: createMockObsMetrics(snapshot.metrics),
      });
      return snapshot;
    },

    on(eventName: ObsEventName, handler: ObsEventHandler) {
      const handlers = listeners.get(eventName) ?? new Set<ObsEventHandler>();
      handlers.add(handler);
      listeners.set(eventName, handlers);

      return () => {
        handlers.delete(handler);
      };
    },
  };
}

export function createMockObsMetrics(previous?: ObsMetricsSnapshot): ObsMetricsSnapshot {
  return {
    bitrateKbps: previous?.bitrateKbps ?? 4500,
    cpuUsagePercent: previous?.cpuUsagePercent ?? 18,
    droppedFrames: previous?.droppedFrames ?? 12,
    skippedFrames: previous?.skippedFrames ?? 0,
    fps: previous?.fps ?? 30,
  };
}

export function streamStateToLive(streamState: ObsStreamState): boolean {
  return streamState === "live" || streamState === "recording_live";
}
