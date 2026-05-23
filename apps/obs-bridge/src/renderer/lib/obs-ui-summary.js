import { OBS_FLOW_STATES, getRuntimeSupportLabel } from "./obs-diagnostics.js";

const METRIC_UNAVAILABLE = "unavailable";
const METRIC_PENDING = "pending";

function formatObsMetric(value, formatter = (v) => String(v)) {
  if (value === null || value === undefined) return METRIC_UNAVAILABLE;
  return formatter(value);
}

function stateLabel(flowState) {
  switch (flowState) {
    case OBS_FLOW_STATES.NATIVE_READONLY_SELECTED:
      return "read-only selected";
    case OBS_FLOW_STATES.CONNECTING:
      return "connecting";
    case OBS_FLOW_STATES.CONNECTED_READONLY:
      return "read-only connected";
    case OBS_FLOW_STATES.UNSUPPORTED_RUNTIME:
      return "unsupported runtime";
    case OBS_FLOW_STATES.CONNECTION_FAILED:
      return "connection failed";
    case OBS_FLOW_STATES.REQUEST_FAILED:
      return "request failed";
    case OBS_FLOW_STATES.DISCONNECTED:
      return "disconnected";
    default:
      return flowState;
  }
}

export function createObsUiSummary(state) {
  const isMock = state.obsClientMode === "mock";
  const flowState = state.obsDiagnostics.connectionState;
  const metrics = state.obs.metrics ?? {};

  if (isMock) {
    const conn = state.obs.connection === "connected" ? "mock connected" : state.obs.connection;
    const stream = state.obs.streamState === "live" ? "mock live" : state.obs.streamState;
    return {
      mode: "mock",
      flowState,
      readOnlyEnabled: false,
      controlEnabled: false,
      connectionLabel: conn,
      streamLabel: stream,
      recordingLabel: state.obs.streamState.includes("recording") ? "ON" : "OFF",
      sceneLabel: state.obs.currentSceneName || "--",
      bitrateLabel: formatObsMetric(metrics.bitrateKbps, (v) => `${v} kbps`),
      cpuLabel: formatObsMetric(metrics.cpuUsagePercent, (v) => `${v}%`),
      droppedLabel: formatObsMetric(metrics.droppedFrames),
      fpsLabel: formatObsMetric(metrics.fps),
      updatedAtLabel: `Last update: ${new Date(state.obs.updatedAt).toLocaleTimeString()}`,
      diagnosticsLabel: getRuntimeSupportLabel(state.obsDiagnostics.runtimeSupport),
      streamPillTone: "live",
      connectionTone: state.obs.connection === "connected" ? "ok" : (state.obs.connection === "error" || state.obs.connection === "disconnected" ? "danger" : "")
    };
  }

  const base = {
    mode: "native-readonly",
    flowState,
    readOnlyEnabled: true,
    controlEnabled: false,
    recordingLabel: "disabled",
    sceneLabel: "--",
    bitrateLabel: METRIC_UNAVAILABLE,
    cpuLabel: METRIC_UNAVAILABLE,
    droppedLabel: METRIC_UNAVAILABLE,
    fpsLabel: METRIC_UNAVAILABLE,
    updatedAtLabel: `Last update: ${new Date(state.obs.updatedAt).toLocaleTimeString()}`,
    diagnosticsLabel: `${stateLabel(flowState)} / ${getRuntimeSupportLabel(state.obsDiagnostics.runtimeSupport)}`,
    streamPillTone: "",
    connectionTone: ""
  };

  if (flowState === OBS_FLOW_STATES.CONNECTED_READONLY) {
    return {
      ...base,
      connectionLabel: "read-only connected",
      streamLabel: state.obs.streamState === "unknown" ? "read-only status" : `read-only ${state.obs.streamState}`,
      sceneLabel: state.obs.currentSceneName || "--",
      bitrateLabel: formatObsMetric(metrics.bitrateKbps, (v) => `${v} kbps`),
      cpuLabel: formatObsMetric(metrics.cpuUsagePercent, (v) => `${v}%`),
      droppedLabel: formatObsMetric(metrics.droppedFrames),
      fpsLabel: formatObsMetric(metrics.fps),
      connectionTone: "ok"
    };
  }

  if (flowState === OBS_FLOW_STATES.CONNECTING) {
    return { ...base, connectionLabel: "connecting", streamLabel: "pending", bitrateLabel: METRIC_PENDING, cpuLabel: METRIC_PENDING, droppedLabel: METRIC_PENDING, fpsLabel: METRIC_PENDING };
  }

  return {
    ...base,
    connectionLabel: stateLabel(flowState),
    streamLabel: flowState === OBS_FLOW_STATES.REQUEST_FAILED ? "stale/unavailable" : "unavailable",
    connectionTone: [OBS_FLOW_STATES.UNSUPPORTED_RUNTIME, OBS_FLOW_STATES.CONNECTION_FAILED, OBS_FLOW_STATES.REQUEST_FAILED, OBS_FLOW_STATES.DISCONNECTED].includes(flowState) ? "danger" : ""
  };
}

export function createObsAlertItems(state, obsSummary) {
  const alerts = [];
  if (state.obsClientMode === "native-readonly") {
    if (obsSummary.flowState === OBS_FLOW_STATES.UNSUPPORTED_RUNTIME) alerts.push(["danger", "Native read-only unavailable: unsupported runtime."]);
    if (obsSummary.flowState === OBS_FLOW_STATES.CONNECTION_FAILED) alerts.push(["danger", "Native read-only connection failed (preview)."]);
    if (obsSummary.flowState === OBS_FLOW_STATES.REQUEST_FAILED) alerts.push(["warning", "Native read-only refresh failed. Metrics are stale or unavailable."]);
    if (obsSummary.flowState === OBS_FLOW_STATES.DISCONNECTED) alerts.push(["warning", "Native read-only disconnected."]);
    if (obsSummary.flowState === OBS_FLOW_STATES.NATIVE_READONLY_SELECTED) alerts.push(["warning", "Native read-only preview selected. Control operations are disabled."]);
  }
  return alerts;
}

export { formatObsMetric };
// native_readonly_selected mapping retained via OBS_FLOW_STATES
