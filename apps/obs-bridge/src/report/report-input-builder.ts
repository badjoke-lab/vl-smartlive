import type { ObsBridgeReportInput } from "./report-input-types";

export function buildObsBridgeReportInput(params: {
  session: Record<string, unknown>;
  comments: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  streamState: Array<Record<string, unknown>>;
  generatedAt?: string;
}): ObsBridgeReportInput {
  return {
    source: "obs-bridge",
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    session: params.session,
    comments: params.comments,
    alerts: params.alerts,
    streamState: params.streamState,
  };
}
