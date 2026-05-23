import type { ObsBridgeClient, ObsEventListeners } from "./obs-client";
import type {
  ObsConnectionConfig,
  ObsConnectionSnapshot,
  ObsEventHandler,
  ObsEventName,
  ObsMetricsSnapshot,
  ObsStreamState,
} from "./obs-types";
import { createInitialObsSnapshot, reduceObsEvent } from "./obs-state";

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "OBS request failed";
}

function toStreamState(outputActive?: boolean, outputReconnecting?: boolean): ObsStreamState {
  if (outputActive) return "live";
  if (outputReconnecting) return "idle";
  return "idle";
}

export function createNativeReadonlyObsBridgeClient(): ObsBridgeClient {
  let snapshot: ObsConnectionSnapshot = createInitialObsSnapshot();
  const listeners: ObsEventListeners = new Map();

  function emit(eventName: ObsEventName, next: Partial<ObsConnectionSnapshot>) {
    snapshot = reduceObsEvent(snapshot, eventName, next);
    const handlers = listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler: ObsEventHandler) => handler(snapshot));
  }

  async function readRuntime(): Promise<Partial<ObsConnectionSnapshot>> {
    const metrics: ObsMetricsSnapshot = {};
    return {
      obsVersion: "readonly",
      streamState: toStreamState(false, false),
      currentSceneName: snapshot.currentSceneName || "Unknown",
      metrics,
    };
  }

  return {
    mode: "native-readonly",
    getSnapshot() {
      return snapshot;
    },
    async connect(config: ObsConnectionConfig) {
      if (typeof WebSocket === "undefined") {
        emit("error", {
          connection: "error",
          host: config.host,
          port: config.port,
          lastError: "unsupported_runtime",
          errorState: "unsupported_runtime",
        });
        return snapshot;
      }

      emit("connectionChanged", {
        connection: "connecting",
        host: config.host,
        port: config.port,
        lastError: undefined,
        errorState: undefined,
      });

      try {
        const runtime = await readRuntime();
        emit("connectionChanged", {
          connection: "connected",
          ...runtime,
        });
      } catch (error) {
        emit("error", {
          connection: "error",
          lastError: toSafeErrorMessage(error),
          errorState: "connection_failed",
        });
      }
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
      if (snapshot.connection !== "connected") return snapshot;
      try {
        const runtime = await readRuntime();
        emit("metricsChanged", runtime);
      } catch (error) {
        emit("error", {
          lastError: toSafeErrorMessage(error),
          errorState: "request_failed",
        });
      }
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
