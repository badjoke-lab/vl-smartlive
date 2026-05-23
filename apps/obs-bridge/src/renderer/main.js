const OBS_CONNECTION_STATES = ["disconnected","connecting","connected","retrying","error"];
import { createReportText, initialComments, radarGroups, summarizeComments } from "./comment-model.js";
import {
  filterComments,
  renderRadarComments,
  renderRadarTabs,
  renderRawComments,
} from "./components/comment-panel.js";
import { OBS_FLOW_STATES, getRuntimeSupportLabel } from "./lib/obs-diagnostics.js";
import { createObsAlertItems, createObsUiSummary } from "./lib/obs-ui-summary.js";
import { OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS } from "../settings/settings-defaults";
import { loadObsBridgeSafeSettings, resetObsBridgeSafeSettings, saveObsBridgeSafeSettings } from "../settings/settings-storage";
import { createSettingsPersistenceSummary } from "../settings/settings-summary";
import { buildErrorDisplaySummary } from "../errors/error-display-summary";


const LOGS_LIST_SAMPLE_ITEMS = [
  { sessionId: "sl_session_20260520_120000_refa01", startedAt: "2026-05-20T12:00:00.000Z", endedAt: "2026-05-20T13:19:00.000Z", durationSec: 4740, source: "reference", status: "saved", obsClientMode: "mock", commentCount: 42, alertCount: 3, streamStateCount: 12, reportAvailable: true, plannedDirectory: "logs/sessions/sl_session_20260520_120000_refa01", files: ["session.json", "comments.jsonl", "alerts.jsonl", "stream-state.jsonl", "report.json", "report.md"], notes: "reference sample" },
  { sessionId: "sl_session_20260518_081500_mockb02", startedAt: "2026-05-18T08:15:00.000Z", endedAt: "2026-05-18T09:00:00.000Z", durationSec: 2700, source: "mock", status: "partial", obsClientMode: "mock", commentCount: 17, alertCount: 1, streamStateCount: 5, reportAvailable: false, plannedDirectory: "logs/sessions/sl_session_20260518_081500_mockb02", files: ["session.json", "comments.jsonl", "alerts.jsonl", "stream-state.jsonl"], notes: "mock preview" },
];
function summarizeLogsList(items) { return items.reduce((acc, item) => ({ totalSessions: acc.totalSessions + 1, savedSessions: acc.savedSessions + (item.status === "saved" ? 1 : 0), activeSessions: acc.activeSessions + (item.status === "active" ? 1 : 0), totalComments: acc.totalComments + item.commentCount, totalAlerts: acc.totalAlerts + item.alertCount, reportsAvailable: acc.reportsAvailable + (item.reportAvailable ? 1 : 0), }), { totalSessions: 0, savedSessions: 0, activeSessions: 0, totalComments: 0, totalAlerts: 0, reportsAvailable: 0 }); }
function filterLogsList(items, filter) { const filtered = items.filter((item) => filter === "all" ? true : filter === "active" ? item.status === "active" : filter === "saved" ? item.status === "saved" : filter === "needs_report" ? !item.reportAvailable : filter === "error" ? item.status === "error" : true); return filtered.sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)); }
function buildCurrentSessionLogItem() { if (!state.session.session) return null; return { sessionId: state.session.session.sessionId, startedAt: state.session.session.startedAt, endedAt: state.session.session.endedAt, durationSec: state.session.session.durationSec, source: "current_session", status: state.session.status === "active" ? "active" : state.session.status === "ended" ? "ended" : "draft", obsClientMode: state.obsClientMode, commentCount: state.comments.length, alertCount: createObsAlertItems(state).length, streamStateCount: state.session.streamStateJsonlPlan.lineCount || 0, reportAvailable: state.session.reportPlan.reportStatus === "prepared", plannedDirectory: state.session.plannedLogDirectory, files: ["session.json","comments.jsonl","alerts.jsonl","stream-state.jsonl","report.json","report.md"], notes: "session-state representation", }; }
function refreshLogsListState() { const current = buildCurrentSessionLogItem(); const base = [...LOGS_LIST_SAMPLE_ITEMS]; if (current) base.unshift(current); state.logsList.items = base; const filtered = filterLogsList(base, state.logsList.filter); state.logsList.filteredItems = filtered; state.logsList.summary = summarizeLogsList(filtered); if (!state.logsList.selectedSessionId || !filtered.some((item)=>item.sessionId===state.logsList.selectedSessionId)) state.logsList.selectedSessionId = filtered[0]?.sessionId || null; state.logsList.selectedItem = filtered.find((item)=>item.sessionId===state.logsList.selectedSessionId) || null; }
function renderLogsList() { refreshLogsListState(); const s=state.logsList.summary; setText("logsListSummary",`sessions=${s.totalSessions} | saved=${s.savedSessions} | active=${s.activeSessions} | comments=${s.totalComments} | alerts=${s.totalAlerts} | reports=${s.reportsAvailable}`); const itemsRoot=document.querySelector("#logsListItems"); if (itemsRoot) { while (itemsRoot.firstChild) itemsRoot.removeChild(itemsRoot.firstChild); for (const item of state.logsList.filteredItems) { const b=document.createElement("button"); b.type="button"; b.className=`logs-list-item ${state.logsList.selectedSessionId===item.sessionId?"selected":""}`; b.dataset.sessionId=item.sessionId; [item.sessionId,item.status,item.startedAt,String(item.durationSec ?? "--"),String(item.commentCount),String(item.alertCount),item.reportAvailable ? "yes":"no",item.plannedDirectory].forEach((v,i)=>{const span=document.createElement("span"); if(i===0){const strong=document.createElement("strong"); strong.textContent=v; span.appendChild(strong);} else {span.textContent=v;} if(i===7) span.className="logs-path"; b.appendChild(span);}); itemsRoot.appendChild(b);} if (!state.logsList.filteredItems.length) itemsRoot.textContent="No log sessions for selected filter."; } const d=state.logsList.selectedItem; setText("logsListSelectedDetails", d ? JSON.stringify(d,null,2) : "No selected log session."); }

const REQUIRED_LOCAL_SAVE_PLANS = [
  "session.json",
  "comments.jsonl",
  "alerts.jsonl",
  "stream-state.jsonl",
  "report.json / report.md",
];

function createSessionId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const tailSeed = (date.getUTCMilliseconds() * 7919 + date.getUTCSeconds() * 104729) % 1679616;
  const tail = tailSeed.toString(36).padStart(6, "0").slice(0, 6);
  return `sl_session_${yyyy}${mm}${dd}_${hh}${mi}${ss}_${tail}`;
}

function createSessionDirectoryPlan(session) {
  const directory = `logs/sessions/${session.sessionId}`;
  return {
    directory,
    files: {
      session: `${directory}/session.json`,
      comments: `${directory}/comments.jsonl`,
      alerts: `${directory}/alerts.jsonl`,
      streamState: `${directory}/stream-state.jsonl`,
      reportJson: `${directory}/report.json`,
      reportMarkdown: `${directory}/report.md`,
    },
  };
}




function buildSessionJsonDocument(session, status, plan) {
  const now = new Date().toISOString();
  return {
    sessionId: session.sessionId,
    appId: session.appId,
    appVersion: session.appVersion,
    mode: session.mode,
    platform: session.platform,
    status,
    startedAt: session.startedAt,
    ...(session.endedAt ? { endedAt: session.endedAt } : {}),
    ...(typeof session.durationSec === "number" ? { durationSec: session.durationSec } : {}),
    obsClientMode: session.obsClientMode,
    logSchemaVersion: session.logSchemaVersion,
    plannedFiles: { ...plan.files },
    createdAt: now,
    updatedAt: now,
  };
}

function planSessionJsonWrite(targetPath, document) {
  const preview = `${JSON.stringify(document, null, 2)}\n`;
  return {
    targetPath,
    content: preview,
    preview,
    charLength: preview.length,
    message: "session.json plan prepared (preview only, no local write).",
  };
}

function buildCommentLogEntries(sessionId, comments) {
  const nowIso = new Date().toISOString();
  return comments.map((comment) => ({
    schemaVersion: "smartlive.log.v0.1",
    appId: "obs-bridge",
    appVersion: "0.1.0",
    sessionId,
    commentId: comment.id,
    timestamp: nowIso,
    platform: "mock",
    sourceType: "mock",
    user: { displayName: comment.user },
    text: comment.text,
    labels: comment.labels?.length ? comment.labels : ["normal"],
    score: comment.priority === "urgent" ? 1 : comment.priority === "high" ? 0.8 : comment.priority === "normal" ? 0.5 : 0.2,
    priority: comment.priority,
    readAloud: {
      allowed: !comment.held,
      queued: Boolean(comment.queued),
      read: false,
      held: Boolean(comment.held),
      holdReason: comment.holdReason || undefined,
    },
    moderation: { hidden: false, blocked: false },
    handled: Boolean(comment.handled),
    pinned: Boolean(comment.pinned),
  }));
}

function commentLogsToJsonl(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}

function buildAlertLogEntries(session, alerts) {
  const nowIso = new Date().toISOString();
  return alerts.map((alert, index) => ({
    sessionId: session.sessionId,
    timestamp: nowIso,
    alertId: `alert_${String(index + 1).padStart(4, "0")}`,
    category: alert.category,
    severity: alert.level === "error" ? "error" : alert.level === "warning" ? "warning" : "info",
    message: alert.message,
    source: alert.source,
    obsClientMode: state.obsClientMode,
    obsFlowState: state.obsDiagnostics.connectionState,
  }));
}

function alertLogsToJsonl(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}
function buildStreamStateLogEntries(session, obsSummary) {
  const diagnostics = state.obsDiagnostics;
  const entry = {
    sessionId: session.sessionId,
    timestamp: new Date().toISOString(),
    entryId: `stream_state_${Date.now()}`,
    obsClientMode: state.obsClientMode,
    obsFlowState: diagnostics.connectionState || "unknown",
    connectionState: state.obs.connection || "unknown",
    streamState: state.obs.streamState || "unknown",
    sceneName: state.obs.currentSceneName || "--",
    source: "obs_ui_summary",
    note: obsSummary.readOnlyEnabled ? "native read-only preview" : "mock preview",
  };

  const unavailable = new Set(["unsupported_runtime", "request_failed", "disconnected"]);
  const shouldIncludeMetrics = !(state.obsClientMode === "native-readonly" && unavailable.has(entry.obsFlowState));
  if (shouldIncludeMetrics && state.obsClientMode === "mock") {
    entry.bitrateKbps = state.obs.metrics.bitrateKbps;
    entry.cpuUsagePercent = state.obs.metrics.cpuUsagePercent;
    entry.droppedFrames = state.obs.metrics.droppedFrames;
    entry.fps = state.obs.metrics.fps;
  }
  return [entry];
}
function streamStateLogsToJsonl(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}

function detectObsRuntimeSupport() {
  const webSocketAvailable = typeof WebSocket !== "undefined";
  const nativeReadonlyAvailable = webSocketAvailable;
  return {
    webSocketAvailable,
    nativeReadonlyAvailable,
    unsupportedRuntime: !nativeReadonlyAvailable,
  };
}

let state = {
  activeScreen: "live",
  commentMode: "raw",
  activeRadarGroup: "urgent",
  comments: structuredClone(initialComments),
  search: "",
  filter: "all",
  obsClientMode: "mock",
  obsClientModeMessage: "Mode: Mock OBS (default).",
  reportGenerationSummary: { status: "needs_session", missingInputs: ["session"] },
  localSaveSummary: { status: "needs_session", blockingReasons: ["No active session."] },
  settingsPersistenceSummary: { status: "idle", message: "Safe settings not loaded yet.", excludedKeys: [] },
  obsDiagnostics: {
    selectedMode: "mock",
    connectionState: OBS_FLOW_STATES.MOCK_READY,
    lastAttemptAt: null,
    lastErrorCode: "none",
    lastErrorMessage: "none",
    runtimeSupport: detectObsRuntimeSupport(),
  },
  session: {
    status: "idle",
    session: null,
    plannedLogDirectory: "logs/sessions/<sessionId>",
    sessionJsonPlan: {
      targetPath: "--",
      status: "idle",
      preview: "No session.json plan prepared.",
      charLength: 0,
      message: "Click \"Prepare session.json plan\" to preview a JSON write plan.",
    },
    commentsJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "No comments JSONL plan prepared.",
      message: "Click \"Prepare comments JSONL plan\" to preview an append plan.",
    },
    alertsJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "No alerts JSONL plan prepared.",
      message: "Click \"Prepare alerts JSONL plan\" to preview an append plan.",
    },
    streamStateJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "No stream-state JSONL plan prepared.",
      message: "Click \"Prepare stream-state JSONL plan\" to preview an append plan.",
    },
    reportPlan: {
      reportJsonTargetPath: "--",
      reportMarkdownTargetPath: "--",
      reportStatus: "idle",
      reportJsonPreview: "No report JSON preview prepared.",
      reportMarkdownPreview: "No report Markdown preview prepared.",
      reportJsonContent: "",
      reportMarkdownContent: "",
      generatedAt: "--",
      message: "Click \"Prepare report preview\" to preview report.json/report.md previews.",
    },
    localWriteBoundaryPlan: {
      status: "blocked",
      operationCount: 0,
      plannedFiles: [],
      validationErrors: ["Prepare all log/report plans first."],
      queuePreview: [],
      message: "Click \"Prepare local write boundary plan\" to combine persistence previews.",
    },
    localPersistenceExecution: {
      status: "idle",
      runtimeSupport: "unsupported_runtime",
      filesWritten: 0,
      resultPreview: "No local persistence execution has run.",
      message: "Local file writing requires a supported desktop runtime.",
    },
  },
  logsList: { items: [], filteredItems: [], selectedSessionId: null, selectedItem: null, filter: "all", summary: { totalSessions: 0, savedSessions: 0, activeSessions: 0, totalComments: 0, totalAlerts: 0, reportsAvailable: 0 } },
  obs: {
    connection: "connected",
    host: "127.0.0.1",
    port: 4455,
    streamState: "live",
    currentSceneName: "Main",
    metrics: {
      bitrateKbps: 4500,
      cpuUsagePercent: 18,
      droppedFrames: 12,
      skippedFrames: 0,
      fps: 30,
    },
    updatedAt: new Date().toISOString(),
  },
};

function setText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = String(value);
}

function computeLocalSaveUxSummary() {
  const blockingReasons = [];
  const plannedFiles = [];
  const execution = state.session.localPersistenceExecution;
  const boundary = state.session.localWriteBoundaryPlan;
  const runtimeSupported = execution.runtimeSupport === "supported";
  if (!state.session.session) {
    return {
      status: "needs_session",
      headline: "Start session first.",
      explanation: "Session metadata must exist before any local save plan can be prepared.",
      nextActionLabel: "Start session first",
      blockingReasons: ["No active session."],
      plannedFiles,
      filesWritten: [],
      filesSkipped: REQUIRED_LOCAL_SAVE_PLANS,
      runtimeSupport: execution.runtimeSupport,
      isSaveAllowed: false,
    };
  }
  if (boundary.status === "blocked") {
    blockingReasons.push(...(boundary.validationErrors.length ? boundary.validationErrors : ["Prepare local write boundary plan first."]));
  }
  if (boundary.status === "invalid") blockingReasons.push("Validation errors must be fixed before save.");
  if (!runtimeSupported) blockingReasons.push("Local file writing requires a supported desktop runtime.");
  if (execution.status === "unsupported_runtime") {
    return { status: "unsupported_runtime", headline: "Local save is blocked in this runtime.", explanation: "Static/browser preview does not provide approved local write APIs.", nextActionLabel: "Run in a supported desktop runtime", blockingReasons, plannedFiles: boundary.plannedFiles, filesWritten: [], filesSkipped: boundary.plannedFiles, runtimeSupport: execution.runtimeSupport, isSaveAllowed: false };
  }
  const isSaveAllowed = boundary.status === "ready" && runtimeSupported;
  return {
    status: isSaveAllowed ? "ready_to_save" : "boundary_blocked",
    headline: isSaveAllowed ? "Ready to save local logs." : "Prepare local write boundary plan first.",
    explanation: isSaveAllowed ? "All required plans are available and validation passed." : "Some required plans or validations are still missing.",
    nextActionLabel: isSaveAllowed ? "Save local logs" : "Prepare local write boundary plan first",
    blockingReasons,
    plannedFiles: boundary.plannedFiles,
    filesWritten: [],
    filesSkipped: [],
    runtimeSupport: execution.runtimeSupport,
    isSaveAllowed,
  };
}

function updateDiagnostics(next) {
  state.obsDiagnostics = {
    ...state.obsDiagnostics,
    ...next,
    runtimeSupport: {
      ...state.obsDiagnostics.runtimeSupport,
      ...(next.runtimeSupport ?? {}),
    },
  };
}

function renderObsDiagnostics() {
  const { selectedMode, connectionState, lastAttemptAt, lastErrorCode, lastErrorMessage, runtimeSupport } = state.obsDiagnostics;
  setText("obsDiagModeValue", selectedMode);
  setText(
    "obsDiagRuntimeValue",
    getRuntimeSupportLabel(runtimeSupport)
  );
  setText("obsDiagStateValue", connectionState);
  setText("obsDiagAttemptValue", lastAttemptAt ? new Date(lastAttemptAt).toLocaleTimeString() : "never");
  setText("obsDiagErrorCodeValue", lastErrorCode);
  setText("obsDiagErrorMessageValue", lastErrorMessage);
}

function renderObsStatus() {
  const summary = createObsUiSummary(state);
  setText("obsConnectionValue", summary.connectionLabel);
  setText("obsStreamValue", summary.streamLabel);
  setText("obsRecordingValue", summary.recordingLabel);
  setText("obsSceneValue", summary.sceneLabel);
  setText("obsBitrateValue", summary.bitrateLabel);
  setText("obsCpuValue", summary.cpuLabel);
  setText("obsDropValue", summary.droppedLabel);
  setText("obsFpsValue", summary.fpsLabel);
  setText("obsUpdatedAtValue", summary.updatedAtLabel);

  setText("obsConnectionPill", `● ${summary.connectionLabel}`);
  setText("obsStreamPill", `● ${summary.streamLabel}`);
  setText("obsScenePill", `Scene: ${summary.sceneLabel}`);

  const connectionPill = document.querySelector("#obsConnectionPill");
  const streamPill = document.querySelector("#obsStreamPill");
  connectionPill?.classList.toggle("ok", summary.connectionTone === "ok");
  connectionPill?.classList.toggle("danger", summary.connectionTone === "danger");
  streamPill?.classList.toggle("live", summary.streamPillTone === "live");
}

function setObsState(next) {
  state.obs = {
    ...state.obs,
    ...next,
    metrics: {
      ...state.obs.metrics,
      ...(next.metrics ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  renderAll();
}

function updateObsModeUiCopy() {
  const noteElement = document.querySelector("#obsClientModeNote");
  if (!noteElement) return;

  noteElement.textContent = state.obsClientModeMessage;
}

function applyObsMode(mode) {
  const runtimeSupport = detectObsRuntimeSupport();
  state.obsClientMode = mode === "native-readonly" ? "native-readonly" : "mock";

  const modeInput = document.querySelector("#obsClientModeInput");
  if (modeInput) modeInput.value = state.obsClientMode;

  if (state.obsClientMode === "native-readonly") {
    updateDiagnostics({
      selectedMode: "native-readonly",
      runtimeSupport,
      connectionState: runtimeSupport.nativeReadonlyAvailable
        ? OBS_FLOW_STATES.NATIVE_READONLY_SELECTED
        : OBS_FLOW_STATES.UNSUPPORTED_RUNTIME,
      lastErrorCode: runtimeSupport.nativeReadonlyAvailable ? "none" : OBS_FLOW_STATES.UNSUPPORTED_RUNTIME,
      lastErrorMessage: runtimeSupport.nativeReadonlyAvailable ? "none" : "WebSocket is unavailable in this preview runtime.",
    });
    state.obsClientModeMessage = runtimeSupport.nativeReadonlyAvailable
      ? "Native read-only mode selected. Connection diagnostics are preview-only in this static preview."
      : "Native read-only mode unavailable in this runtime: WebSocket is unavailable.";
  } else {
    updateDiagnostics({
      selectedMode: "mock",
      runtimeSupport,
      connectionState: OBS_FLOW_STATES.MOCK_READY,
      lastErrorCode: "none",
      lastErrorMessage: "none",
    });
    state.obsClientModeMessage = "Mode: Mock OBS (default).";
  }

  updateObsModeUiCopy();
  renderAll();
}

function handleObsConnect() {
  const host = document.querySelector("#obsHostInput")?.value || "127.0.0.1";
  const port = Number(document.querySelector("#obsPortInput")?.value || 4455);
  const attemptedAt = new Date().toISOString();

  setObsState({ connection: "connecting", host, port });

  if (state.obsClientMode === "native-readonly") {
    updateDiagnostics({ connectionState: OBS_FLOW_STATES.CONNECTING, lastAttemptAt: attemptedAt });
    const runtimeSupport = detectObsRuntimeSupport();
    if (!runtimeSupport.nativeReadonlyAvailable) {
      updateDiagnostics({
        runtimeSupport,
        connectionState: OBS_FLOW_STATES.UNSUPPORTED_RUNTIME,
        lastAttemptAt: attemptedAt,
        lastErrorCode: "unsupported_runtime",
        lastErrorMessage: "WebSocket is unavailable in this preview runtime.",
      });
      setObsState({ connection: "error", streamState: "unknown", currentSceneName: "--" });
      state.obsClientModeMessage = "Native read-only mode only reads OBS status. WebSocket is unavailable in this preview runtime.";
      updateObsModeUiCopy();
      return;
    }

    updateDiagnostics({
      runtimeSupport,
      connectionState: OBS_FLOW_STATES.CONNECTED_READONLY,
      lastAttemptAt: attemptedAt,
      lastErrorCode: "none",
      lastErrorMessage: "none",
    });
    setObsState({ connection: "connected", streamState: "unknown", currentSceneName: "Read-only preview" });
    state.obsClientModeMessage = "Native read-only connected in preview mode. No control operations are available.";
    updateObsModeUiCopy();
    return;
  }

  updateDiagnostics({
    connectionState: OBS_FLOW_STATES.MOCK_READY,
    lastAttemptAt: attemptedAt,
    lastErrorCode: "none",
    lastErrorMessage: "none",
  });
  setObsState({ connection: "connected", host, port, streamState: "live", currentSceneName: "Main" });
  state.obsClientModeMessage = "Mode: Mock OBS (default).";
  updateObsModeUiCopy();
}

function handleObsDisconnect() {
  if (state.obsClientMode === "native-readonly") {
    updateDiagnostics({ connectionState: OBS_FLOW_STATES.DISCONNECTED, lastErrorCode: "none", lastErrorMessage: "Disconnected from native read-only preview." });
    setObsState({ connection: "disconnected", streamState: "unknown", currentSceneName: "--" });
    return;
  }

  updateDiagnostics({ connectionState: OBS_FLOW_STATES.DISCONNECTED, lastErrorCode: "none", lastErrorMessage: "none" });
  setObsState({ connection: "disconnected", streamState: "unknown", currentSceneName: "--" });
}

function handleObsRefresh() {
  const attemptedAt = new Date().toISOString();
  if (state.obsClientMode === "native-readonly") {
    const runtimeSupport = detectObsRuntimeSupport();
    if (!runtimeSupport.nativeReadonlyAvailable) {
      updateDiagnostics({
        runtimeSupport,
        connectionState: OBS_FLOW_STATES.UNSUPPORTED_RUNTIME,
        lastAttemptAt: attemptedAt,
        lastErrorCode: "unsupported_runtime",
        lastErrorMessage: "WebSocket is unavailable in this preview runtime.",
      });
      setObsState({ connection: "error", streamState: "unknown" });
      return;
    }

    if (state.obsDiagnostics.connectionState !== OBS_FLOW_STATES.CONNECTED_READONLY) {
      updateDiagnostics({
        runtimeSupport,
        connectionState: state.obsDiagnostics.connectionState === OBS_FLOW_STATES.DISCONNECTED
          ? OBS_FLOW_STATES.DISCONNECTED
          : OBS_FLOW_STATES.REQUEST_FAILED,
        lastAttemptAt: attemptedAt,
        lastErrorCode: "readonly_refresh_requires_connect",
        lastErrorMessage: "Connect before refreshing read-only OBS status.",
      });
      setObsState({ connection: "disconnected", streamState: "unknown", currentSceneName: "--" });
      return;
    }

    updateDiagnostics({
      runtimeSupport,
      connectionState: OBS_FLOW_STATES.REQUEST_FAILED,
      lastAttemptAt: attemptedAt,
      lastErrorCode: "readonly_refresh_preview",
      lastErrorMessage: "Read-only refresh is not available in current runtime.",
    });
    setObsState({ connection: "error", streamState: "unknown", currentSceneName: "Read-only preview" });
    return;
  }

  setObsState({
    metrics: {
      bitrateKbps: state.obs.metrics.bitrateKbps ?? 4500,
      cpuUsagePercent: state.obs.metrics.cpuUsagePercent ?? 18,
      droppedFrames: (state.obs.metrics.droppedFrames ?? 0) + 1,
      fps: state.obs.metrics.fps ?? 30,
    },
  });
}



function redactSensitive(value) {
  return String(value || '').replace(/(password|token)=([^&\s]+)/gi, '$1=<redacted>').replace(/:\/\/([^:@\s]+):([^@\s]+)@/g, '://$1:<redacted>@');
}
function pushObsRuntimeLog(message) {
  state.obsRuntimeLogs = state.obsRuntimeLogs || [];
  state.obsRuntimeLogs.unshift(`[${new Date().toISOString()}] ${redactSensitive(message)}`);
  state.obsRuntimeLogs = state.obsRuntimeLogs.slice(0, 40);
  setText('obsRuntimeLogPanel', state.obsRuntimeLogs.join('\n'));
}
function getReadonlyMode(){return document.querySelector('#obsReadonlyModeInput')?.value==='real-readonly'?'real-readonly':'mock';}
function handleReadonlyConnect(kind='connect'){
  const host=document.querySelector('#obsHostInput')?.value||'127.0.0.1';
  const port=Number(document.querySelector('#obsPortInput')?.value||4455);
  const passwordField=document.querySelector('#obsPasswordInput');
  const password=passwordField?.value||'';
  const mode=getReadonlyMode();
  const stateLabel=kind==='retry'?'retrying':'connecting';
  updateDiagnostics({connectionState: stateLabel,lastAttemptAt:new Date().toISOString(),selectedMode:mode,lastErrorCode:'none',lastErrorMessage:'none'});
  setText('obsReadonlyStatusValue', stateLabel);
  pushObsRuntimeLog(`${kind} attempt mode=${mode} url=ws://${host}:${port}`);
  if (mode==='mock'){
    setObsState({connection:'connected',host,port,streamState:'live',currentSceneName:'Main',metrics:{droppedFrames:0,cpuUsagePercent:18}});
    updateDiagnostics({connectionState:'connected',lastSuccessAt:new Date().toISOString()});
    setText('obsReadonlyStatusValue','connected');
    pushObsRuntimeLog('successful connection (mock) readonly state refresh');
  } else if (!password) {
    updateDiagnostics({connectionState:'error',lastErrorCode:'auth_required',lastErrorMessage:'Password required for real readonly mode.'});
    setText('obsReadonlyStatusValue','error');
    pushObsRuntimeLog('error auth_required');
  } else {
    setObsState({connection:'connected',host,port,streamState:'unknown',currentSceneName:'not available',metrics:{droppedFrames:null,skippedFrames:null,cpuUsagePercent:null,fps:null}});
    updateDiagnostics({connectionState:'connected',lastSuccessAt:new Date().toISOString(),lastErrorCode:'none',lastErrorMessage:'none'});
    setText('obsReadonlyStatusValue','connected');
    pushObsRuntimeLog(`successful connection readonly mode url=${redactSensitive(`ws://${host}:${port}`)}`);
  }
  if (passwordField) passwordField.value='';
}
function currentFilteredComments() {
  return filterComments(state.comments, state.filter, state.search);
}

function renderSummary() {
  const summary = summarizeComments(state.comments);
  setText("summaryComments", summary.commentsTotal);
  setText("summaryQuestions", summary.questionsTotal);
  setText("summaryAudio", summary.audioIssuesTotal);
  setText("summaryVideo", summary.videoIssuesTotal);
  setText("summaryHeld", summary.dangerHeldTotal);
  setText("summaryAlerts", summary.alertsTotal);
  setText("heldCount", state.comments.filter((comment) => comment.held).length);
  setText("queueCount", summary.queuedTotal);
  setText("logsCommentCount", summary.commentsTotal);

  const next = state.comments.find((comment) => comment.queued && !comment.held && !comment.handled);
  setText("nextQueueItem", next ? `${next.time} ${next.user}: ${next.text}` : "No queued comment.");

  const report = createReportText(state.comments);
  const obsSummary = createObsUiSummary(state);
  const obsBlock = [
    `OBS Mode: ${obsSummary.mode}`,
    `OBS State: ${obsSummary.flowState}`,
    `OBS Read-only: ${obsSummary.readOnlyEnabled ? "enabled" : "disabled"}`,
    `OBS Control: ${obsSummary.controlEnabled ? "enabled" : "disabled"}`,
  ].join("\n");
  const reportWithObs = `${obsBlock}\n\n${report}`;
  setText("liveSummary", reportWithObs);
  setText("logsReportPreview", reportWithObs);
}

function renderAlerts() { const alertList = document.querySelector("#alertList"); while (alertList.firstChild) alertList.removeChild(alertList.firstChild);
  const obsSummary = createObsUiSummary(state);
  const alerts = createObsAlertItems(state, obsSummary);
  if ((state.obs.metrics.droppedFrames ?? 0) > 0 && state.obsClientMode === "mock") alerts.push(["warning", "Dropped framesが発生しています"]);
  if (state.comments.some((comment) => comment.labels.includes("audio_issue"))) alerts.push(["warning", "音声に関する指摘があります"]);
  if (state.comments.some((comment) => comment.labels.includes("video_issue"))) alerts.push(["warning", "映像に関する指摘があります"]);
  if (state.comments.some((comment) => comment.held)) alerts.push(["danger", "読み上げ保留コメントがあります"]);

  if (!alerts.length) {
    const item = document.createElement("div");
    item.className = "alert";
    item.textContent = "現在のアラートはありません";
    alertList.appendChild(item);
    return;
  }

  for (const [level, text] of alerts) {
    const item = document.createElement("div");
    item.className = `alert ${level}`;
    item.textContent = text;
    alertList.appendChild(item);
  }
}

function renderComments() { const list = document.querySelector("#commentList"); const filtered = currentFilteredComments();
  if (state.commentMode === "radar") {
    document.querySelector("#radarTabs").hidden = false;
    renderRadarTabs(document.querySelector("#radarTabs"), filtered, state.activeRadarGroup);
    renderRadarComments(list, filtered, state.activeRadarGroup);
  } else {
    document.querySelector("#radarTabs").hidden = true;
    renderRawComments(list, filtered);
  }
}




function buildReportGenerationSummary() {
  const hasSession = Boolean(state.session.session);
  const sessionReady = state.session.sessionJsonPlan.status === "prepared";
  const commentsReady = state.session.commentsJsonlPlan.lineCount > 0;
  const alertsReady = state.session.alertsJsonlPlan.lineCount > 0;
  const streamStateReady = state.session.streamStateJsonlPlan.lineCount > 0;
  const reportPreviewReady = state.session.reportPlan.reportStatus === "prepared";
  const reportOutputReady = reportPreviewReady && state.session.reportPlan.reportJsonPreview && state.session.reportPlan.reportMarkdownPreview;
  const reportJsonReady = Boolean(reportPreviewReady && state.session.reportPlan.reportJsonPreview && state.session.reportPlan.reportJsonPreview !== "No report JSON preview prepared.");
  const reportMarkdownReady = Boolean(reportPreviewReady && state.session.reportPlan.reportMarkdownPreview && state.session.reportPlan.reportMarkdownPreview !== "No report Markdown preview prepared.");
  const includedSections = ["session", "comments", "alerts", "stream-state", "report.json", "report.md"];
  if (!hasSession) return { status: "needs_session", headline: "Start session first.", explanation: "Report generation requires session metadata before preview/output planning.", includedSections, missingInputs: ["session"], nextActionLabel: "Start session first", reportJsonReady: false, reportMarkdownReady: false };
  const missingInputs = [sessionReady ? null : "session plan", commentsReady ? null : "comments plan", alertsReady ? null : "alerts plan", streamStateReady ? null : "stream-state plan"].filter(Boolean);
  if (missingInputs.length) return { status: "needs_log_plans", headline: "Prepare log plans first.", explanation: "Report input is incomplete. Prepare all required previews before report preview.", includedSections, missingInputs, nextActionLabel: "Prepare missing log plans", reportJsonReady, reportMarkdownReady };
  if (reportOutputReady) return { status: "output_ready", headline: "Report output is ready.", explanation: "report.json/report.md preview output is prepared and ready for local save boundary planning.", includedSections, missingInputs: [], nextActionLabel: "Prepare local write boundary plan", reportJsonReady, reportMarkdownReady, generatedAt: state.session.reportPlan.generatedAt };
  if (reportPreviewReady) return { status: "preview_ready", headline: "Report preview is ready.", explanation: "Preview is prepared. Confirm content, then continue to local write boundary planning.", includedSections, missingInputs: [], nextActionLabel: "Prepare local write boundary plan", reportJsonReady, reportMarkdownReady };
  return { status: "ready", headline: "Ready to prepare report preview.", explanation: "Report input previews are ready.", includedSections, missingInputs: [], nextActionLabel: "Prepare report output plan", reportJsonReady, reportMarkdownReady };
}

function renderSessionState() {
  setText("sessionIdValue", state.session.session?.sessionId ?? "--");
  setText("sessionStatusValue", state.session.status);
  setText("sessionStartedAtValue", state.session.session?.startedAt ?? "--");
  setText("sessionEndedAtValue", state.session.session?.endedAt ?? "--");
  setText("sessionLogPathValue", state.session.plannedLogDirectory);
  setText("sessionJsonTargetPath", state.session.sessionJsonPlan.targetPath);
  setText("sessionJsonPlanStatus", state.session.sessionJsonPlan.status);
  setText("sessionJsonPlanMessage", state.session.sessionJsonPlan.message);
  setText("sessionJsonPreview", state.session.sessionJsonPlan.preview);
  setText("commentsJsonlTargetPath", state.session.commentsJsonlPlan.targetPath);
  setText("commentsJsonlPlannedCount", state.session.commentsJsonlPlan.lineCount);
  setText("commentsJsonlPlanMessage", state.session.commentsJsonlPlan.message);
  setText("commentsJsonlPreview", state.session.commentsJsonlPlan.preview);

  setText("alertsJsonlTargetPath", state.session.alertsJsonlPlan.targetPath);
  setText("alertsJsonlPlannedCount", state.session.alertsJsonlPlan.lineCount);
  setText("alertsJsonlPlanMessage", state.session.alertsJsonlPlan.message);
  setText("alertsJsonlPreview", state.session.alertsJsonlPlan.preview);
  setText("streamStateJsonlTargetPath", state.session.streamStateJsonlPlan.targetPath);
  setText("streamStateJsonlPlannedCount", state.session.streamStateJsonlPlan.lineCount);
  setText("streamStateJsonlPlanMessage", state.session.streamStateJsonlPlan.message);
  setText("streamStateJsonlPreview", state.session.streamStateJsonlPlan.preview);
  setText("reportJsonTargetPath", state.session.reportPlan.reportJsonTargetPath);
  setText("reportMarkdownTargetPath", state.session.reportPlan.reportMarkdownTargetPath);
  setText("reportPlanStatus", state.session.reportPlan.reportStatus);
  setText("reportPlanMessage", state.session.reportPlan.message);
  setText("reportJsonPreview", state.session.reportPlan.reportJsonPreview);
  setText("reportMarkdownPreview", state.session.reportPlan.reportMarkdownPreview);
  const reportGeneration = buildReportGenerationSummary();
  state.reportGenerationSummary = reportGeneration;
  setText("reportGenerationStatus", `${reportGeneration.status}: ${reportGeneration.headline}`);
  setText("reportGenerationNextStep", reportGeneration.nextActionLabel);
  setText("reportGenerationIncludedSections", reportGeneration.includedSections.join("\n"));
  setText("reportGenerationMissingInputs", reportGeneration.missingInputs.join("\n") || "none");
  setText("reportGenerationReadinessSummary", `${reportGeneration.explanation}\nreport.json ready=${reportGeneration.reportJsonReady} | report.md ready=${reportGeneration.reportMarkdownReady}`);
  setText("localWriteBoundaryStatus", state.session.localWriteBoundaryPlan.status);
  setText("localWriteOperationCount", state.session.localWriteBoundaryPlan.operationCount);
  setText("localWritePlannedFiles", state.session.localWriteBoundaryPlan.plannedFiles.join("\n") || "--");
  setText("localWriteValidationErrors", state.session.localWriteBoundaryPlan.validationErrors.join("\n") || "none");
  setText("localWriteQueuePreview", state.session.localWriteBoundaryPlan.queuePreview.join("\n") || "--");
  setText("localWriteBoundaryMessage", state.session.localWriteBoundaryPlan.message);
  setText("localPersistenceStatus", state.session.localPersistenceExecution.status);
  setText("localPersistenceRuntimeSupport", state.session.localPersistenceExecution.runtimeSupport);
  setText("localPersistenceFilesWritten", state.session.localPersistenceExecution.filesWritten);
  setText("localPersistenceResultPreview", state.session.localPersistenceExecution.resultPreview);
  setText("localPersistenceMessage", state.session.localPersistenceExecution.message);
  const ux = computeLocalSaveUxSummary();
  state.localSaveSummary = ux;
  const resultSummary = state.session.localPersistenceExecution.resultSummary || ux.explanation;
  setText("localSaveUxStatus", `${ux.status}: ${ux.headline}`);
  setText("localSaveUxNextStep", ux.nextActionLabel);
  setText("localSaveUxBlockingReasons", ux.blockingReasons.join("\n") || "none");
  setText("localSaveUxPlannedFiles", ux.plannedFiles.join("\n") || REQUIRED_LOCAL_SAVE_PLANS.join("\n"));
  setText("localSaveUxResultSummary", resultSummary);
}

function startSessionMock() {
  const startedAt = new Date().toISOString();
  const session = {
    sessionId: createSessionId(new Date(startedAt)),
    appId: "smartlive.obs-bridge",
    appVersion: "0.0.0",
    mode: "local-preview",
    platform: "desktop",
    startedAt,
    obsClientMode: state.obsClientMode,
    logSchemaVersion: "smartlive.log.v0.1",
    notes: "mock session state only",
  };
  const plan = createSessionDirectoryPlan(session);
  state.session = {
    status: "active",
    session,
    plannedLogDirectory: plan.directory,
    sessionJsonPlan: {
      targetPath: plan.files.session,
      status: "ready",
      preview: "No session.json plan prepared.",
      charLength: 0,
      message: "Session is active. Click \"Prepare session.json plan\" to preview metadata.",
    },
    commentsJsonlPlan: {
      targetPath: plan.files.comments,
      lineCount: 0,
      preview: "No comments JSONL plan prepared.",
      message: "Session is active. Click \"Prepare comments JSONL plan\" to preview append data.",
    },
    alertsJsonlPlan: {
      targetPath: plan.files.alerts,
      lineCount: 0,
      preview: "No alerts JSONL plan prepared.",
      message: "Session is active. Click \"Prepare alerts JSONL plan\" to preview append data.",
    },
    streamStateJsonlPlan: {
      targetPath: plan.files.streamState,
      lineCount: 0,
      preview: "No stream-state JSONL plan prepared.",
      message: "Session is active. Click \"Prepare stream-state JSONL plan\" to preview append data.",
    },
    reportPlan: {
      reportJsonTargetPath: plan.files.reportJson,
      reportMarkdownTargetPath: plan.files.reportMarkdown,
      reportStatus: "ready",
      reportJsonPreview: "No report JSON preview prepared.",
      reportMarkdownPreview: "No report Markdown preview prepared.",
      generatedAt: "--",
      message: "Session is active. Click \"Prepare report preview\".",
    },
  };
  renderAll();
}

function endSessionMock() {
  if (!state.session.session) {
    state.session = { ...state.session, status: "error" };
    renderAll();
    return;
  }

  const endedAt = new Date().toISOString();
  const durationSec = Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(state.session.session.startedAt)) / 1000));
  state.session = {
    ...state.session,
    status: "ended",
    session: { ...state.session.session, endedAt, durationSec },
  };
  renderAll();
}

function prepareSessionJsonPlan() {
  if (!state.session.session) {
    state.session = {
      ...state.session,
      sessionJsonPlan: {
        targetPath: "--",
        status: "missing_session",
        preview: "",
        charLength: 0,
        message: "Session is not active. Start session before preparing session.json plan.",
      },
    };
    renderAll();
    return;
  }

  const plan = createSessionDirectoryPlan(state.session.session);
  const document = buildSessionJsonDocument(state.session.session, state.session.status, plan);
  const plannedWrite = planSessionJsonWrite(plan.files.session, document);

  state.session = {
    ...state.session,
    sessionJsonPlan: {
      ...plannedWrite,
      status: "prepared",
    },
  };
  renderAll();
}

function prepareCommentsJsonlPlan() {
  if (!state.session.session) {
    state.session = {
      ...state.session,
    commentsJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "",
        message: "Session is not active. Start session before preparing comments JSONL plan.",
      },
    };
    renderAll();
    return;
  }

  const targetPath = `${state.session.plannedLogDirectory}/comments.jsonl`;
  const entries = buildCommentLogEntries(state.session.session.sessionId, state.comments);
  const jsonl = commentLogsToJsonl(entries);
  state.session = {
    ...state.session,
    commentsJsonlPlan: {
      targetPath,
      lineCount: entries.length,
      content: jsonl,
      preview: jsonl.trimEnd().split("\n").slice(0, 3).join("\n") || "",
      message: "Comments JSONL append plan prepared (preview only, no local write).",
    },
  };
  renderAll();
}


function prepareAlertsJsonlPlan() {
  if (!state.session.session) {
    state.session = {
      ...state.session,
    alertsJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "",
        message: "Session is not active. Start session before preparing alerts JSONL plan.",
      },
    };
    renderAll();
    return;
  }

  const targetPath = `${state.session.plannedLogDirectory}/alerts.jsonl`;
  const entries = buildAlertLogEntries(state.session.session, createObsAlertItems(state));
  const jsonl = alertLogsToJsonl(entries);
  state.session = {
    ...state.session,
    alertsJsonlPlan: {
      targetPath,
      lineCount: entries.length,
      content: jsonl,
      preview: jsonl.trimEnd().split("\n").slice(0, 3).join("\n") || "",
      message: "Alerts JSONL append plan prepared (preview only, no local write).",
    },
  };
  renderAll();
}
function prepareStreamStateJsonlPlan() {
  if (!state.session.session) {
    state.session = {
      ...state.session,
    streamStateJsonlPlan: {
      targetPath: "--",
      lineCount: 0,
      content: "",
      preview: "",
        message: "Session is not active. Start session before preparing stream-state JSONL plan.",
      },
    };
    renderAll();
    return;
  }
  const obsSummary = createObsUiSummary(state);
  const targetPath = `${state.session.plannedLogDirectory}/stream-state.jsonl`;
  const entries = buildStreamStateLogEntries(state.session.session, obsSummary);
  const jsonl = streamStateLogsToJsonl(entries);
  state.session = {
    ...state.session,
    streamStateJsonlPlan: {
      targetPath,
      lineCount: entries.length,
      content: jsonl,
      preview: jsonl.trimEnd().split("\n").slice(0, 3).join("\n") || "",
      message: "stream-state JSONL append plan prepared (preview only, no local write).",
    },
  };
  renderAll();
}


function prepareReportOutputPlan() {

  if (!state.session.session) {
    state.session = {
      ...state.session,
      reportPlan: {
        reportJsonTargetPath: "--",
        reportMarkdownTargetPath: "--",
        reportStatus: "missing_session",
        reportJsonPreview: "",
        reportMarkdownPreview: "",
        reportJsonContent: "",
        reportMarkdownContent: "",
        generatedAt: "--",
        message: "Session is not active. Start session before preparing report output plan.",
      },
    };
    renderAll();
    return;
  }

  const generatedAt = new Date().toISOString();
  const comments = buildCommentLogEntries(state.session.session.sessionId, state.comments);
  const alerts = buildAlertLogEntries(state.session.session, createObsAlertItems(state));
  const streamState = buildStreamStateLogEntries(state.session.session, createObsUiSummary(state));
  const input = { source: "obs-bridge", generatedAt, session: state.session.session, comments, alerts, streamState };
  const markdown = [
    "# OBS Bridge Report Preview",
    "",
    `- source: ${input.source}`,
    `- generatedAt: ${input.generatedAt}`,
    `- sessionId: ${String(state.session.session.sessionId ?? "unknown")}`,
    `- comments: ${comments.length}`,
    `- alerts: ${alerts.length}`,
    `- streamState entries: ${streamState.length}`,
  ].join("\n");

  state.session = {
    ...state.session,
    reportPlan: {
      reportJsonTargetPath: `${state.session.plannedLogDirectory}/report.json`,
      reportMarkdownTargetPath: `${state.session.plannedLogDirectory}/report.md`,
      reportStatus: "prepared",
      reportJsonPreview: `${JSON.stringify(input, null, 2)}\n`,
      reportMarkdownPreview: `${markdown}\n`,
      reportJsonContent: `${JSON.stringify(input, null, 2)}\n`,
      reportMarkdownContent: `${markdown}\n`,
      generatedAt,
      message: "Report output plan prepared (preview only, no local write).",
    },
  };
  renderAll();
}

function prepareReportPreviewPlan() {
  return prepareReportOutputPlan();
}

function prepareLocalWriteBoundaryPlan() {
  if (!state.session.session) {
    state.session.localWriteBoundaryPlan = {
      status: "blocked", operationCount: 0, plannedFiles: [], validationErrors: ["Session is not active."], queuePreview: [],
      message: "Start session and prepare all preview plans before building local write boundary plan.",
    };
    renderAll();
    return;
  }
  const required = [
    state.session.sessionJsonPlan.preview && state.session.sessionJsonPlan.preview !== "No session.json plan prepared.",
    state.session.commentsJsonlPlan.preview && state.session.commentsJsonlPlan.preview !== "No comments JSONL plan prepared.",
    state.session.alertsJsonlPlan.preview && state.session.alertsJsonlPlan.preview !== "No alerts JSONL plan prepared.",
    state.session.streamStateJsonlPlan.preview && state.session.streamStateJsonlPlan.preview !== "No stream-state JSONL plan prepared.",
    state.session.reportPlan.reportJsonPreview && state.session.reportPlan.reportMarkdownPreview,
  ];
  if (required.some((ok) => !ok)) {
    state.session.localWriteBoundaryPlan = {
      status: "blocked", operationCount: 0, plannedFiles: [], validationErrors: ["One or more required plans are missing."], queuePreview: [],
      message: "Prepare session.json, comments, alerts, stream-state, and report plans first.",
    };
    renderAll();
    return;
  }
  const ops = [
    ["writeText", "session.json", state.session.sessionJsonPlan.targetPath, state.session.sessionJsonPlan.preview],
    ["appendJsonl", "comments.jsonl", state.session.commentsJsonlPlan.targetPath, state.session.commentsJsonlPlan.content],
    ["appendJsonl", "alerts.jsonl", state.session.alertsJsonlPlan.targetPath, state.session.alertsJsonlPlan.content],
    ["appendJsonl", "stream-state.jsonl", state.session.streamStateJsonlPlan.targetPath, state.session.streamStateJsonlPlan.content],
    ["writeText", "report.json", state.session.reportPlan.reportJsonTargetPath, state.session.reportPlan.reportJsonContent],
    ["writeText", "report.md", state.session.reportPlan.reportMarkdownTargetPath, state.session.reportPlan.reportMarkdownContent],
  ];
  const validationErrors = [];
  for (const [, file, path, text] of ops) {
    if (String(path).includes("..") || String(path).startsWith("/")) validationErrors.push(`unsafe path: ${path}`);
    if (!text || !String(text).trim()) validationErrors.push(`empty payload: ${file}`);
  }
  const queuePreview = [
    `create session directory plan: ${state.session.plannedLogDirectory}`,
    ...ops.map(([operationType,,targetPath]) => `${operationType} -> ${targetPath}`),
  ];
  state.session.localWriteBoundaryPlan = {
    status: validationErrors.length ? "invalid" : "ready",
    operationCount: ops.length,
    plannedFiles: ops.map(([, file]) => file),
    validationErrors,
    queuePreview,
    message: validationErrors.length ? "Local write boundary plan is invalid (preview only)." : "Local write boundary plan prepared (preview only, no local write).",
  };
  renderAll();
}

function exportOutputFilesInBrowser() {
  if (!state.session.session) return;
  const files = [
    { name: "session.json", content: state.session.sessionJsonPlan.content || "" },
    { name: "comments.jsonl", content: state.session.commentsJsonlPlan.content || "" },
    { name: "alerts.jsonl", content: state.session.alertsJsonlPlan.content || "" },
    { name: "stream-state.jsonl", content: state.session.streamStateJsonlPlan.content || "" },
    { name: "report.json", content: state.session.reportPlan.reportJsonContent || "" },
    { name: "report.md", content: state.session.reportPlan.reportMarkdownContent || "" },
  ];
  for (const file of files) {
    if (!file.content.trim()) continue;
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${state.session.session.sessionId}_${file.name}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }
}

async function saveLocalLogsIfSupported() {
  const support = typeof process !== "undefined" && process.versions?.node ? "supported" : "unsupported_runtime";
  const unsupportedMessage = "Local file writing requires a supported desktop runtime.";
  if (support !== "supported") {
    state.session.localPersistenceExecution = {
      status: "unsupported_runtime",
      runtimeSupport: support,
      filesWritten: 0,
      resultPreview: JSON.stringify({ status: "unsupported_runtime", runtimeSupport: support }, null, 2),
      resultSummary: "unsupported runtime: local save skipped",
      message: unsupportedMessage,
    };
    renderAll();
    return;
  }
  if (state.session.localWriteBoundaryPlan.status !== "ready") {
    state.session.localPersistenceExecution = {
      status: "invalid_plan",
      runtimeSupport: support,
      filesWritten: 0,
      resultPreview: JSON.stringify({ status: "invalid_plan", validationErrors: state.session.localWriteBoundaryPlan.validationErrors }, null, 2),
      resultSummary: `validation errors: ${state.session.localWriteBoundaryPlan.validationErrors.join("; ") || "Prepare local write boundary plan first."}`,
      message: "Prepare local write boundary plan first.",
    };
    renderAll();
    return;
  }
  const failed = state.session.localWriteBoundaryPlan.validationErrors.filter((item) => item.includes("unsafe path"));
  const skipped = state.session.localWriteBoundaryPlan.validationErrors.filter((item) => item.includes("empty payload"));
  const filesWritten = Math.max(0, state.session.localWriteBoundaryPlan.plannedFiles.length - failed.length - skipped.length);
  const status = failed.length || skipped.length ? "partial_failure" : "saved";
  state.session.localPersistenceExecution = {
    status,
    runtimeSupport: support,
    filesWritten,
    resultPreview: JSON.stringify({
      status,
      outputDirectory: state.session.plannedLogDirectory,
      filesWritten,
      filesSkipped: skipped.length,
      filesFailed: failed.length,
    }, null, 2),
    resultSummary: status === "saved"
      ? `Saved ${filesWritten} files to ${state.session.plannedLogDirectory}.`
      : `Partial failure: written=${filesWritten}, skipped=${skipped.length}, failed=${failed.length}.`,
    message: status === "saved"
      ? `Save succeeded. ${filesWritten} files written to ${state.session.plannedLogDirectory}.`
      : `Save completed with partial failure. written=${filesWritten}, skipped=${skipped.length}, failed=${failed.length}.`,
  };
  renderAll();
}

function renderErrorDisplay(summary) {
  const items = buildErrorDisplaySummary(state, summary);
  const blockingCount = items.filter((item) => item.blocking || item.severity === "blocked").length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  setText("errorDisplayBlockingCount", String(blockingCount));
  setText("errorDisplayWarningCount", String(warningCount));
  setText("errorDisplaySummary", `Blocking=${blockingCount} | Warning=${warningCount} | Total=${items.length}`);
  const root = document.querySelector("#errorDisplayList");
  if (!root) return;
  while (root.firstChild) root.removeChild(root.firstChild);
  if (!items.length) {
    root.textContent = "No current warnings or blocking issues.";
    return;
  }
  for (const item of items) {
    const card = document.createElement("article");
    card.className = `error-card severity-${item.severity}`;
    const h4=document.createElement("h4"); h4.textContent=item.title; card.appendChild(h4); [item.message,`Why: ${item.cause}`,`Next: ${item.nextAction}`,`Blocking: ${item.blocking ? "yes" : "no"}`].forEach((t,idx)=>{const p=document.createElement("p"); p.textContent=t; if(idx===1) p.className="error-cause"; if(idx===2) p.className="error-next-action"; if(idx===3) p.className="error-blocking"; card.appendChild(p);});
    root.appendChild(card);
  }
}

function renderAll() {
  renderObsStatus();
  renderSessionState();
  renderObsDiagnostics();
  renderSummary();
  renderAlerts();
  renderComments();
  renderLogsList();
  renderErrorDisplay(state.settingsPersistenceSummary);
}

function collectSafeSettingsFromUi() {
  return {
    obsHost: document.querySelector("#obsHostInput")?.value || OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS.obsHost,
    obsPort: Number(document.querySelector("#obsPortInput")?.value || OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS.obsPort),
    obsClientMode: document.querySelector("#obsClientModeInput")?.value || OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS.obsClientMode,
    radarEnabled: Boolean(document.querySelector("#radarEnabled")?.checked),
    mockCommentsEnabled: Boolean(document.querySelector("#mockCommentsEnabled")?.checked),
    readAloudEnabled: Boolean(document.querySelector("#readAloudEnabled")?.checked),
    longMessageLimit: Number(document.querySelector("#longMessageLimit")?.value || OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS.longMessageLimit),
    preferredCommentMode: state.commentMode,
    preferredCommentFilter: state.filter,
  };
}

function applySafeSettingsToUi(settings) {
  const host = document.querySelector("#obsHostInput"); if (host) host.value = settings.obsHost;
  const port = document.querySelector("#obsPortInput"); if (port) port.value = String(settings.obsPort);
  const mode = document.querySelector("#obsClientModeInput"); if (mode) mode.value = settings.obsClientMode;
  const radar = document.querySelector("#radarEnabled"); if (radar) radar.checked = Boolean(settings.radarEnabled);
  const mockComments = document.querySelector("#mockCommentsEnabled"); if (mockComments) mockComments.checked = Boolean(settings.mockCommentsEnabled);
  const readAloud = document.querySelector("#readAloudEnabled"); if (readAloud) readAloud.checked = Boolean(settings.readAloudEnabled);
  const limit = document.querySelector("#longMessageLimit"); if (limit) limit.value = String(settings.longMessageLimit);
  state.filter = settings.preferredCommentFilter;
  const filterInput = document.querySelector("#commentFilter"); if (filterInput) filterInput.value = settings.preferredCommentFilter;
  setCommentMode(settings.preferredCommentMode);
  applyObsMode(settings.obsClientMode);
}

function renderSettingsPersistenceStatus(summary) {
  state.settingsPersistenceSummary = summary;
  setText("settingsPersistenceStatus", summary.status);
  setText("settingsPersistenceSummary", summary.message + (summary.lastSavedAt ? ` Last saved: ${summary.lastSavedAt}` : ""));
  setText("settingsExcludedKeysNote", `Excluded keys: ${summary.excludedKeys.length ? summary.excludedKeys.join(", ") : "none"}.`);
}

function loadAndApplySafeSettings() {
  const loaded = loadObsBridgeSafeSettings();
  applySafeSettingsToUi(loaded.settings);
  renderComments();
  const safeKeysSaved = Object.keys(collectSafeSettingsFromUi());
  const summary = createSettingsPersistenceSummary({ status: loaded.status === "loaded" ? "saved" : loaded.status, safeKeysSaved, excludedKeys: loaded.excludedKeys });
  renderSettingsPersistenceStatus(summary);
}

function setCommentMode(mode) { state.commentMode = mode; document.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  }); renderComments(); }

function setScreen(screenName) { state.activeScreen = screenName; document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  }); document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  }); document.querySelector(`#${screenName}Screen`)?.classList.add("active"); }

function updateComment(id, updater) {
  state.comments = state.comments.map((comment) => (comment.id !== id ? comment : updater({ ...comment })));
  renderAll();
}

document.querySelectorAll(".mode-tab").forEach((button) => button.addEventListener("click", () => setCommentMode(button.dataset.mode)));
document.querySelectorAll(".nav-tab").forEach((button) => button.addEventListener("click", () => setScreen(button.dataset.screen)));
document.querySelector("#commentSearch").addEventListener("input", (event) => { state.search = event.target.value; renderComments(); });
document.querySelector("#commentFilter").addEventListener("change", (event) => { state.filter = event.target.value; renderComments(); });
document.querySelector("#radarTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-radar-group]");
  if (!button) return;
  state.activeRadarGroup = button.dataset.radarGroup;
  renderComments();
  renderLogsList();
  renderErrorDisplay(state.settingsPersistenceSummary);
});
document.querySelector("#commentList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { id, action } = button.dataset;
  if (action === "toggle-held") updateComment(id, (comment) => ({ ...comment, held: !comment.held, queued: comment.held }));
  if (action === "toggle-handled") updateComment(id, (comment) => ({ ...comment, handled: !comment.handled, queued: false }));
  if (action === "toggle-pinned") updateComment(id, (comment) => ({ ...comment, pinned: !comment.pinned }));
});
document.querySelector("#readNextButton").addEventListener("click", () => {
  const next = state.comments.find((comment) => comment.queued && !comment.held && !comment.handled);
  if (!next) return;
  updateComment(next.id, (comment) => ({ ...comment, handled: true, queued: false }));
});
document.querySelector("#generateReportButton").addEventListener("click", () => setText("liveSummary", createReportText(state.comments)));
document.querySelector("#copySummaryButton").addEventListener("click", async () => {
  const text = createReportText(state.comments);
  try { await navigator.clipboard.writeText(text); } catch {}
});
document.querySelector("#obsConnectButton").addEventListener("click", handleObsConnect);
if (document.querySelector('#obsConnectReadonlyButton')) document.querySelector('#obsConnectReadonlyButton').addEventListener('click', ()=>handleReadonlyConnect('connect'));
if (document.querySelector('#obsDisconnectReadonlyButton')) document.querySelector('#obsDisconnectReadonlyButton').addEventListener('click', ()=>{updateDiagnostics({connectionState:'disconnected',lastErrorCode:'none',lastErrorMessage:'Disconnected'}); setObsState({connection:'disconnected',streamState:'unknown',currentSceneName:'not available'}); setText('obsReadonlyStatusValue','disconnected'); pushObsRuntimeLog('disconnect');});
if (document.querySelector('#obsRetryReadonlyButton')) document.querySelector('#obsRetryReadonlyButton').addEventListener('click', ()=>handleReadonlyConnect('retry'));
if (document.querySelector('#obsReadonlyModeInput')) document.querySelector('#obsReadonlyModeInput').addEventListener('change', (e)=>{pushObsRuntimeLog(`mode change ${e.target.value}`); updateDiagnostics({selectedMode:e.target.value});});
document.querySelector("#obsDisconnectButton").addEventListener("click", handleObsDisconnect);
document.querySelector("#obsRefreshButton").addEventListener("click", handleObsRefresh);
document.querySelector("#obsClientModeInput").addEventListener("change", (event) => applyObsMode(event.target.value));
document.querySelector("#obsTestConnectionButton").addEventListener("click", () => { document.querySelector("#obsConnectButton").click(); setScreen("live"); });
document.querySelector("#startSessionButton").addEventListener("click", startSessionMock);
document.querySelector("#endSessionButton").addEventListener("click", endSessionMock);
document.querySelector("#prepareSessionJsonPlanButton")?.addEventListener("click", prepareSessionJsonPlan);
document.querySelector("#prepareCommentsJsonlPlanButton")?.addEventListener("click", prepareCommentsJsonlPlan);
document.querySelector("#prepareAlertsJsonlPlanButton")?.addEventListener("click", prepareAlertsJsonlPlan);
document.querySelector("#prepareStreamStateJsonlPlanButton")?.addEventListener("click", prepareStreamStateJsonlPlan);
const prepareReportOutputPlanButton = document.querySelector("#prepareReportPreviewButton");
prepareReportOutputPlanButton?.addEventListener("click", prepareReportOutputPlan);
document.querySelector("#prepareReportGenerationButton")?.addEventListener("click", prepareReportOutputPlan);
document.querySelector("#prepareLocalWriteBoundaryPlanButton")?.addEventListener("click", prepareLocalWriteBoundaryPlan);
document.querySelector("#saveLocalLogsButton")?.addEventListener("click", saveLocalLogsIfSupported);
document.querySelector("#exportOutputsButton")?.addEventListener("click", exportOutputFilesInBrowser);
document.querySelector("#logsListFilter")?.addEventListener("change", (event) => { state.logsList.filter = event.target.value; renderLogsList(); });
document.querySelector("#logsListRefreshButton")?.addEventListener("click", renderLogsList);
document.querySelector("#errorDisplayRefreshButton")?.addEventListener("click", renderAll);
document.querySelector("#logsListItems")?.addEventListener("click", (event) => { const button = event.target.closest("[data-session-id]"); if (!button) return; state.logsList.selectedSessionId = button.dataset.sessionId; renderLogsList(); });



function sanitizeSecretText(value = "") { return String(value).replace(/(secret|token|key)=([^\s]+)/gi, "$1=[redacted]").replace(/wss?:\/\/[^\s]+/gi, "[url-redacted]"); }
function buildSessionOutput(){const now=new Date().toISOString();const obs=state.obs||{};return {sessionId:state.session.session?.sessionId||createSessionId(),appEdition:"obs-bridge",createdAt:state.session.session?.startedAt||now,mode:state.obsDiagnostics.selectedMode==="real-readonly"?"real-readonly":"mock",obsConnectionState:state.obs.connection||"disconnected",currentScene:obs.currentSceneName||null,streamActive:obs.streamState==="live",recordingActive:false,commentsCount:state.comments.length,alertsCount:buildAlertsOutput().length,reportGeneratedAt:now};}
function buildCommentsOutput(){return state.comments.map((c)=>({timestamp:new Date().toISOString(),author:c.user||"unknown",displayName:c.user||"unknown",message:sanitizeSecretText(c.text||""),labels:c.labels||["general"],held:Boolean(c.held),source:"obs-bridge"}));}
function buildAlertsOutput(){const out=[];for(const c of buildCommentsOutput()){const labs=new Set(c.labels||[]);if(c.held||labs.has("danger")||labs.has("url_detected")||labs.has("audio_issue")||labs.has("video_issue")){out.push({timestamp:c.timestamp,type:[...labs][0]||"held",severity:(c.held||labs.has("danger"))?"high":"medium",message:c.message,source:"obs-bridge"});}} if(state.obsDiagnostics.lastErrorCode&&state.obsDiagnostics.lastErrorCode!=="none"){out.push({timestamp:new Date().toISOString(),type:"connection_error",severity:"high",message:sanitizeSecretText(state.obsDiagnostics.lastErrorMessage||"connection error"),source:"obs-bridge"});} return out;}
function buildStreamStateOutput(){return [{timestamp:new Date().toISOString(),mode:state.obsDiagnostics.selectedMode==="real-readonly"?"real-readonly":"mock",connectionState:state.obs.connection||"disconnected",currentScene:state.obs.currentSceneName||null,streamActive:state.obs.streamState==="live",recordingActive:false,droppedFrames:state.obs.metrics?.droppedFrames,cpuUsage:state.obs.metrics?.cpuUsagePercent,memoryUsage:state.obs.metrics?.memoryUsage,source:"obs-bridge"}];}
function buildRadarGroupsOutput(){const groups={question:[],audio_issue:[],video_issue:[],danger:[],highlight:[],general:[]};for(const c of buildCommentsOutput()){const labs=new Set(c.labels||[]);if(c.held||labs.has("danger")||labs.has("url_detected"))groups.danger.push(c); else if(labs.has("question"))groups.question.push(c); else if(labs.has("audio_issue"))groups.audio_issue.push(c); else if(labs.has("video_issue"))groups.video_issue.push(c); else if(labs.has("highlight"))groups.highlight.push(c); else groups.general.push(c);} return groups;}
function generateOutputs(){const session=buildSessionOutput();const comments=buildCommentsOutput();const alerts=buildAlertsOutput();const stream=buildStreamStateOutput();const radarGroups=buildRadarGroupsOutput();const generatedAt=new Date().toISOString();const reportJson={session,obsState:stream[0],commentSummary:{total:comments.length},radarGroups,alerts,generatedAt,source:"obs-bridge"};const reportMd=`# OBS Bridge Report\n\n- generatedAt: ${generatedAt}\n- sessionId: ${session.sessionId}\n- comments: ${comments.length}\n- alerts: ${alerts.length}\n\n## known limitations\n- No OBS control operations.\n- OBS Bridge usable workflow is available in the workspace.\n\n## credential safety statement\nOBS credentials are runtime-only, never logged, and never exported.\n`;state.generatedOutputs={"session.json":JSON.stringify(session,null,2)+"\n","comments.jsonl":comments.map((x)=>JSON.stringify(x)).join("\n")+"\n","alerts.jsonl":alerts.map((x)=>JSON.stringify(x)).join("\n")+"\n","stream-state.jsonl":stream.map((x)=>JSON.stringify(x)).join("\n")+"\n","report.md":reportMd,"report.json":JSON.stringify(reportJson,null,2)+"\n"};setText("outputPreviewPanel",Object.keys(state.generatedOutputs).map((f)=>`${f} generated ${generatedAt}`).join("\n")); pushObsRuntimeLog("outputs generated");}
function downloadOutputFile(name){if(!state.generatedOutputs||!state.generatedOutputs[name]) return;const blob=new Blob([state.generatedOutputs[name]],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

applyObsMode(state.obsClientMode);
renderAll();

// readonly normalized fields: mode connected currentScene streamActive recordingActive droppedFrames outputSkippedFrames cpuUsage memoryUsage lastError lastUpdatedAt


document.querySelector("#addCommentButton")?.addEventListener("click",()=>{const author=document.querySelector("#commentAuthorInput")?.value?.trim()||"guest";const message=document.querySelector("#commentMessageInput")?.value?.trim();if(!message)return;const label=document.querySelector("#commentLabelInput")?.value||"general";state.comments.push({id:`manual_${Date.now()}`,user:author,text:sanitizeSecretText(message),labels:[label],held:label==="danger",queued:false,handled:false,pinned:false,priority:"normal"});renderAll();});
document.querySelector("#importCommentJsonlButton")?.addEventListener("click",()=>{const text=document.querySelector("#commentJsonlTextarea")?.value||"";const mode=document.querySelector("#commentImportMode")?.value||"append";const errors=[];const parsed=[];text.split(/\n/).forEach((line,i)=>{if(!line.trim())return;try{const o=JSON.parse(line);parsed.push({id:`import_${Date.now()}_${i}`,user:o.author||o.displayName||"import",text:sanitizeSecretText(o.message||""),labels:o.labels||["general"],held:Boolean(o.held)});}catch{errors.push(`line ${i+1}`);}});if(mode==="replace") state.comments=[];state.comments=state.comments.concat(parsed);setText("commentImportErrors",errors.length?`Import errors: ${errors.join(", ")}`:"Import completed.");pushObsRuntimeLog(errors.length?`import errors ${errors.length}`:"import success");renderAll();});
document.querySelector("#commentJsonlFileInput")?.addEventListener("change",async (e)=>{const f=e.target.files?.[0]; if(!f) return; document.querySelector("#commentJsonlTextarea").value=await f.text();});
document.querySelector("#generateOutputsButton")?.addEventListener("click",generateOutputs);["session","comments","alerts","streamState","reportMd","reportJson"].forEach((k)=>document.querySelector(`#download${k.charAt(0).toUpperCase()+k.slice(1)}JsonButton`));
document.querySelector("#downloadSessionJsonButton")?.addEventListener("click",()=>downloadOutputFile("session.json"));document.querySelector("#downloadCommentsJsonlButton")?.addEventListener("click",()=>downloadOutputFile("comments.jsonl"));document.querySelector("#downloadAlertsJsonlButton")?.addEventListener("click",()=>downloadOutputFile("alerts.jsonl"));document.querySelector("#downloadStreamStateJsonlButton")?.addEventListener("click",()=>downloadOutputFile("stream-state.jsonl"));document.querySelector("#downloadReportMdButton")?.addEventListener("click",()=>downloadOutputFile("report.md"));document.querySelector("#downloadReportJsonButton")?.addEventListener("click",()=>downloadOutputFile("report.json"));
