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
import { OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS } from "../settings/settings-defaults.js";
import { loadObsBridgeSafeSettings, resetObsBridgeSafeSettings, saveObsBridgeSafeSettings } from "../settings/settings-storage.js";
import { createSettingsPersistenceSummary } from "../settings/settings-summary.js";
import { buildErrorDisplaySummary } from "../errors/error-display-summary.js";


const LOGS_LIST_SAMPLE_ITEMS = [
  { sessionId: "sl_session_20260520_120000_refa01", startedAt: "2026-05-20T12:00:00.000Z", endedAt: "2026-05-20T13:19:00.000Z", durationSec: 4740, source: "reference", status: "saved", obsClientMode: "mock", commentCount: 42, alertCount: 3, streamStateCount: 12, reportAvailable: true, plannedDirectory: "logs/sessions/sl_session_20260520_120000_refa01", files: ["session.json", "comments.jsonl", "alerts.jsonl", "stream-state.jsonl", "report.json", "report.md"], notes: "reference sample" },
  { sessionId: "sl_session_20260518_081500_mockb02", startedAt: "2026-05-18T08:15:00.000Z", endedAt: "2026-05-18T09:00:00.000Z", durationSec: 2700, source: "mock", status: "partial", obsClientMode: "mock", commentCount: 17, alertCount: 1, streamStateCount: 5, reportAvailable: false, plannedDirectory: "logs/sessions/sl_session_20260518_081500_mockb02", files: ["session.json", "comments.jsonl", "alerts.jsonl", "stream-state.jsonl"], notes: "mock preview" },
];
function summarizeLogsList(items) { return items.reduce((acc, item) => ({ totalSessions: acc.totalSessions + 1, savedSessions: acc.savedSessions + (item.status === "saved" ? 1 : 0), activeSessions: acc.activeSessions + (item.status === "active" ? 1 : 0), totalComments: acc.totalComments + item.commentCount, totalAlerts: acc.totalAlerts + item.alertCount, reportsAvailable: acc.reportsAvailable + (item.reportAvailable ? 1 : 0), }), { totalSessions: 0, savedSessions: 0, activeSessions: 0, totalComments: 0, totalAlerts: 0, reportsAvailable: 0 }); }
function filterLogsList(items, filter) { const filtered = items.filter((item) => filter === "all" ? true : filter === "active" ? item.status === "active" : filter === "saved" ? item.status === "saved" : filter === "needs_report" ? !item.reportAvailable : filter === "error" ? item.status === "error" : true); return filtered.sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)); }
function buildCurrentSessionLogItem() { if (!state.session.session) return null; return { sessionId: state.session.session.sessionId, startedAt: state.session.session.startedAt, endedAt: state.session.session.endedAt, durationSec: state.session.session.durationSec, source: "current_session", status: state.session.status === "active" ? "active" : state.session.status === "ended" ? "ended" : "draft", obsClientMode: state.obsClientMode, commentCount: state.comments.length, alertCount: createObsAlertItems(state).length, streamStateCount: state.session.streamStateJsonlPlan.lineCount || 0, reportAvailable: state.session.reportPlan.reportStatus === "prepared", plannedDirectory: state.session.plannedLogDirectory, files: ["session.json","comments.jsonl","alerts.jsonl","stream-state.jsonl","report.json","report.md"], notes: "session-state representation", }; }
function refreshLogsListState() { const current = buildCurrentSessionLogItem(); const base = [...LOGS_LIST_SAMPLE_ITEMS]; if (current) base.unshift(current); state.logsList.items = base; const filtered = filterLogsList(base, state.logsList.filter); state.logsList.filteredItems = filtered; state.logsList.summary = summarizeLogsList(filtered); if (!state.logsList.selectedSessionId || !filtered.some((item)=>item.sessionId===state.logsList.selectedSessionId)) state.logsList.selectedSessionId = filtered[0]?.sessionId || null; state.logsList.selectedItem = filtered.find((item)=>item.sessionId===state.logsList.selectedSessionId) || null; }