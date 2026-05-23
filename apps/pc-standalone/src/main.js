import { t, getLanguage, setLanguage } from './i18n.js';

const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const PERSIST_KEY = 'pcStandaloneSettings';
const SAFE_PERSIST_KEYS = new Set(['rtmpUrl', 'selectedSource', 'selectedPlatform', 'selectedPreset', 'defaultCommentTab', 'showCommentPanel', 'maxComments', 'readAloudEnabled', 'stabilityModeEnabled', 'autoSuggestionEnabled', 'themeColor', 'appScale']);
const RADAR_PRIORITY = { warning: 0, question: 1, issue: 2, general: 2, praise: 3 };

const baseComments = [
  { id: 'c1', time: '12:28:31', author: 'takebon', handle: '@takebon_live', radar: 'warning', category: 'Audio/video trouble', message: 'Audio may be a little quiet.' },
  { id: 'c2', time: '12:28:40', author: 'yuuki', handle: '@yuuki_q', radar: 'question', category: 'Questions', message: 'Can this be used from a phone too?' },
  { id: 'c3', time: '12:28:55', author: 'sakura', handle: '@sakura_fan', radar: 'praise', category: 'Hype', message: 'Looks good. Looking forward to the stream.' },
  { id: 'c4', time: '12:29:10', author: 'ops_bot', handle: '@ops_monitor', radar: 'issue', category: 'Audio/video trouble', message: 'Minor frame jitter detected.' }
];

const defaults = {
  screen: 'Live',
  language: getLanguage(),
  commentMode: 'Raw',
  selectedComment: 'c1',
  comments: baseComments.map((c) => ({ ...c, pinned: false, done: false, hidden: false, muted: false, read: false })),
  prepare: {
    selectedSource: 'Screen', selectedPlatform: 'Custom RTMP', selectedPreset: 'Stable', rtmpUrl: '', validationStatus: 'Missing target',
    title: '', category: '', streamLanguage: 'English', commentIntegration: 'YouTube comments ON / Twitch OFF / Raw default'
  },
  settings: {
    activeSettingsTab: 'Stream settings', defaultCommentTab: 'Raw', showCommentPanel: true, maxComments: 100,
    readAloudEnabled: true, stabilityModeEnabled: false, autoSuggestionEnabled: true, themeColor: 'blue', appScale: '100%',
    resolutionFps: '1280x720 @ 30fps', videoBitrate: '4500', audioBitrate: '160'
  },
  stability: { stabilityMode: false, lastAction: 'Idle', reassessCount: 0, recommendationApplied: false },
  report: { statusMessage: '' }
};

function loadSafePersisted() {
  const raw = JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}');
  const safe = {};
  Object.entries(raw).forEach(([k, v]) => { if (SAFE_PERSIST_KEYS.has(k)) safe[k] = v; });
  return safe;
}

const persisted = loadSafePersisted();
const state = structuredClone(defaults);
Object.assign(state.prepare, { rtmpUrl: persisted.rtmpUrl || '', selectedSource: persisted.selectedSource || defaults.prepare.selectedSource, selectedPlatform: persisted.selectedPlatform || defaults.prepare.selectedPlatform, selectedPreset: persisted.selectedPreset || defaults.prepare.selectedPreset });
Object.assign(state.settings, {
  defaultCommentTab: persisted.defaultCommentTab || defaults.settings.defaultCommentTab,
  showCommentPanel: persisted.showCommentPanel ?? defaults.settings.showCommentPanel,
  maxComments: persisted.maxComments ?? defaults.settings.maxComments,
  readAloudEnabled: persisted.readAloudEnabled ?? defaults.settings.readAloudEnabled,
  stabilityModeEnabled: persisted.stabilityModeEnabled ?? defaults.settings.stabilityModeEnabled,
  autoSuggestionEnabled: persisted.autoSuggestionEnabled ?? defaults.settings.autoSuggestionEnabled,
  themeColor: persisted.themeColor || defaults.settings.themeColor,
  appScale: persisted.appScale || defaults.settings.appScale
});
state.commentMode = state.settings.defaultCommentTab;

const navItems = ['Live', 'Prepare', 'Comments', 'Stability', 'Settings', 'Report'];
const legacyTerms = ['Scene: Game Main','Screen capture','Microphone','Upload speed','CPU usage','GPU usage','Connected','Setup steps','Comment integration','Alert summary','Stability mode recommended','Summary metric cards','Highlight candidates','Trouble history','Ready for preview'];
const el = (tag, txt, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };

function persistSafeSettings() {
  const safe = {
    rtmpUrl: state.prepare.rtmpUrl, selectedSource: state.prepare.selectedSource, selectedPlatform: state.prepare.selectedPlatform, selectedPreset: state.prepare.selectedPreset,
    defaultCommentTab: state.settings.defaultCommentTab, showCommentPanel: state.settings.showCommentPanel, maxComments: state.settings.maxComments,
    readAloudEnabled: state.settings.readAloudEnabled, stabilityModeEnabled: state.settings.stabilityModeEnabled, autoSuggestionEnabled: state.settings.autoSuggestionEnabled,
    themeColor: state.settings.themeColor, appScale: state.settings.appScale
  };
  localStorage.setItem(PERSIST_KEY, JSON.stringify(safe));
}

function assertNoSecretsInExport(text) {
  const low = text.toLowerCase();
  if (/"(streamkey|password|secret|token)"\s*:\s*(?!\s*false\b)/i.test(text)) throw new Error('blocked secret field in export');
  if (/(streamkey|password|secret|token)\s*[:=]\s*['\"](?!false\b)/i.test(text) || low.includes('obs password')) throw new Error('blocked secret-like value in export');
  return true;
}

function visibleComments() {
  return orderedComments().filter((c) => !c.hidden).slice(0, state.settings.maxComments);
}
function orderedComments() {
  return state.commentMode === 'Raw' ? [...state.comments] : [...state.comments].sort((a, b) => (RADAR_PRIORITY[a.radar] ?? 9) - (RADAR_PRIORITY[b.radar] ?? 9));
}
function selectedCommentObj() { return state.comments.find((c) => c.id === state.selectedComment) || state.comments[0]; }
function markAction(message) { state.report.statusMessage = message; }
function updateComment(id, patch) { const c = state.comments.find((x) => x.id === id); if (!c) return; Object.assign(c, patch); render(); }
function safeDownload(filename, text) { assertNoSecretsInExport(text); const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function languageToggle() { const lang = el('div', undefined, 'row lang-toggle'); lang.append(el('span', t('language'))); [['en', t('english')], ['ja', t('japanese')]].forEach(([c, l]) => { const b = el('button', l, state.language === c ? 'active' : ''); b.onclick = () => { setLanguage(c); state.language = c; render(); }; lang.append(b); }); return lang; }
function sidebar() { const side = el('aside', undefined, 'sidebar'); const nav = el('nav', undefined, 'nav'); navItems.forEach((n) => { const b = el('button', t(n.toLowerCase()), state.screen === n ? 'active nav-btn' : 'nav-btn'); b.onclick = () => { state.screen = n; render(); }; nav.append(b); }); const status = el('section', undefined, 'status-card'); [['Connection', 'OK'], ['Encoder', state.stability.stabilityMode ? 'Stability mode ON' : 'Stable'], ['Dropped frames', '0.42%'], ['Bitrate', '4.2 Mbps']].forEach(([k, v]) => { const r = el('div', undefined, 'kv'); r.append(el('span', k), el('strong', v)); status.append(r); }); side.append(nav, status); return side; }

function buildCommentsPanel() { const wrap = el('section', undefined, 'panel comments-panel'); const tabs = el('div', undefined, 'tabs'); ['Raw', 'Radar'].forEach((m) => { const b = el('button', m, state.commentMode === m ? 'active' : ''); b.onclick = () => { state.commentMode = m; render(); }; tabs.append(b); }); wrap.append(tabs); const list = el('div', undefined, 'comment-list'); visibleComments().forEach((c) => { const it = el('article', undefined, `comment ${c.radar} ${state.selectedComment === c.id ? 'selected' : ''}`); it.onclick = () => { state.selectedComment = c.id; render(); }; const marks = `${c.pinned ? 'Pinned ' : ''}${c.done ? 'Done ' : ''}${c.muted ? 'Muted' : ''}`.trim(); it.append(el('p', c.message), el('small', marks || '')); list.append(it); }); wrap.append(list); return wrap; }

function liveScreen() { const area = el('section', undefined, 'main'); const g = el('div', undefined, 'live-shell'); g.append(el('section', 'LIVE PREVIEW', 'panel')); if (state.settings.showCommentPanel) g.append(buildCommentsPanel()); area.append(g); return area; }

function prepareScreen() { const m = el('section', undefined, 'main'); const g = el('section', undefined, 'panel dense'); const mkCards = (title, values, selectedKey, cb) => { g.append(el('h3', title)); const row = el('div', undefined, 'card-grid'); values.forEach((v) => { const c = el('button', v, `subcard ${state.prepare[selectedKey] === v ? 'active' : ''}`); c.onclick = () => { state.prepare[selectedKey] = v; persistSafeSettings(); render(); }; row.append(c); }); g.append(row); };
  mkCards('Source selection', ['Screen', 'Window', 'Camera', 'Mic only'], 'selectedSource');
  mkCards('Platform selection', ['YouTube', 'Twitch', 'Custom RTMP'], 'selectedPlatform');
  mkCards('Preset', ['Stable', 'Balanced', 'High quality', 'Low latency'], 'selectedPreset');
  const rt = el('article', undefined, 'subcard'); const r = el('input'); r.placeholder = 'RTMP / RTMPS URL'; r.value = state.prepare.rtmpUrl; r.oninput = () => { state.prepare.rtmpUrl = r.value; persistSafeSettings(); }; const k = el('input'); k.type = 'password'; k.placeholder = t('runtimeStreamKey');
  const status = el('p', `Validation status: ${state.prepare.validationStatus}`);
  const b = el('button', t('validateSetup')); b.onclick = () => { const u = state.prepare.rtmpUrl.trim(); state.prepare.validationStatus = !u ? 'Missing target' : (u.startsWith('rtmp://') || u.startsWith('rtmps://')) ? 'OK' : 'Invalid target'; k.value = ''; render(); };
  rt.append(r, k, el('p', t('streamKeyNotSaved')), b, status); g.append(rt); m.append(g); return m; }

function commentsScreen() { const m = el('section', undefined, 'main'); const w = el('section', undefined, 'panel'); const tabs = el('div', undefined, 'toolbar'); ['Raw', 'Radar'].forEach((x) => { const b = el('button', x, state.commentMode === x ? 'active' : ''); b.onclick = () => { state.commentMode = x; state.settings.defaultCommentTab = x; persistSafeSettings(); render(); }; tabs.append(b); }); w.append(tabs);
  const grid = el('div', undefined, 'comments-grid'); const list = el('div', undefined, 'comment-list'); visibleComments().forEach((c) => { const it = el('article', undefined, `comment ${state.selectedComment === c.id ? 'selected' : ''}`); it.onclick = () => { state.selectedComment = c.id; render(); }; it.append(el('p', `${c.author}: ${c.message}`), el('small', `${c.pinned ? 'Pinned ' : ''}${c.done ? 'Done ' : ''}${c.muted ? 'Muted' : ''}`)); list.append(it); });
  const sel = selectedCommentObj(); const d = el('aside', undefined, 'subcard'); d.append(el('h3', 'Selected comment'), el('p', sel.message), el('p', state.report.statusMessage || ''));
  [['Read aloud', () => { updateComment(sel.id, { read: true }); markAction('Read queued'); }], ['Pin', () => { updateComment(sel.id, { pinned: !sel.pinned }); }], ['Mark done', () => { updateComment(sel.id, { done: !sel.done }); }], ['Hide comment', () => { updateComment(sel.id, { hidden: true }); }], ['Mute user', () => { updateComment(sel.id, { muted: true }); }]].forEach(([name, fn]) => { const b = el('button', name); b.onclick = () => { fn(); render(); }; d.append(b); });
  grid.append(list, d); w.append(grid); m.append(w); return m; }

function stabilityScreen() { const m = el('section', undefined, 'main'); const p = el('section', undefined, 'panel'); const s = el('p', state.stability.stabilityMode ? 'Stability mode ON' : 'Stability mode OFF');
  const on = el('button', t('switchToStabilityMode')); on.onclick = () => { state.stability.stabilityMode = true; state.stability.recommendationApplied = true; state.stability.lastAction = 'Stability mode ON'; state.settings.stabilityModeEnabled = true; markAction('Stability mode ON'); persistSafeSettings(); render(); };
  const later = el('button', t('reassessLater')); later.onclick = () => { state.stability.reassessCount += 1; state.stability.lastAction = 'Reassess scheduled'; markAction('Reassess scheduled'); render(); };
  const open = el('button', t('openDetailedSettings')); open.onclick = () => { state.screen = 'Settings'; state.settings.activeSettingsTab = 'Stability settings'; render(); };
  p.append(s, on, later, open, el('p', `Reassess count: ${state.stability.reassessCount}`)); m.append(p); return m; }

function settingsScreen() { const m = el('section', undefined, 'main'); const p = el('section', undefined, 'panel'); const tabs = ['Stream settings', 'Input settings', 'Display settings', 'Comment settings', 'Read-aloud settings', 'Stability settings']; const tr = el('div', undefined, 'tabs');
  tabs.forEach((x) => { const b = el('button', x, state.settings.activeSettingsTab === x ? 'active' : ''); b.onclick = () => { state.settings.activeSettingsTab = x; render(); }; tr.append(b); }); p.append(tr);
  const active = el('article', undefined, 'subcard'); active.append(el('h3', state.settings.activeSettingsTab));
  if (state.settings.activeSettingsTab === 'Stream settings') {
    const plat = el('input'); plat.value = state.prepare.selectedPlatform; plat.oninput = () => { state.prepare.selectedPlatform = plat.value; persistSafeSettings(); };
    const res = el('input'); res.value = state.settings.resolutionFps; res.oninput = () => { state.settings.resolutionFps = res.value; };
    const vb = el('input'); vb.value = state.settings.videoBitrate; vb.oninput = () => { state.settings.videoBitrate = vb.value; };
    const ab = el('input'); ab.value = state.settings.audioBitrate; ab.oninput = () => { state.settings.audioBitrate = ab.value; };
    active.append(plat, res, vb, ab);
  }
  if (state.settings.activeSettingsTab === 'Comment settings') {
    ['Raw', 'Radar'].forEach((x) => { const b = el('button', x, state.settings.defaultCommentTab === x ? 'active' : ''); b.onclick = () => { state.settings.defaultCommentTab = x; state.commentMode = x; render(); }; active.append(b); });
    const show = el('button', `show comment panel: ${state.settings.showCommentPanel ? 'ON' : 'OFF'}`); show.onclick = () => { state.settings.showCommentPanel = !state.settings.showCommentPanel; render(); };
    const max = el('input'); max.type = 'number'; max.value = String(state.settings.maxComments); max.oninput = () => { state.settings.maxComments = Math.max(1, Number(max.value) || 1); };
    active.append(show, max);
  }
  if (state.settings.activeSettingsTab === 'Read-aloud settings') { const b = el('button', `Enable read-aloud: ${state.settings.readAloudEnabled ? 'ON' : 'OFF'}`); b.onclick = () => { state.settings.readAloudEnabled = !state.settings.readAloudEnabled; render(); }; active.append(b); }
  if (state.settings.activeSettingsTab === 'Stability settings') { const a = el('button', `Stability mode: ${state.settings.stabilityModeEnabled ? 'ON' : 'OFF'}`); a.onclick = () => { state.settings.stabilityModeEnabled = !state.settings.stabilityModeEnabled; render(); }; const b = el('button', `Auto suggestion: ${state.settings.autoSuggestionEnabled ? 'ON' : 'OFF'}`); b.onclick = () => { state.settings.autoSuggestionEnabled = !state.settings.autoSuggestionEnabled; render(); }; active.append(a, b); }
  p.append(active);
  const bar = el('div', undefined, 'toolbar');
  [['Import settings', () => markAction('Import settings (mock)')], ['Export settings', () => safeDownload('settings.json', JSON.stringify({ prepare: { selectedPlatform: state.prepare.selectedPlatform, rtmpUrl: state.prepare.rtmpUrl, selectedSource: state.prepare.selectedSource, selectedPreset: state.prepare.selectedPreset }, settings: { ...state.settings } }, null, 2))], ['Reset to defaults', () => { Object.assign(state.prepare, defaults.prepare); Object.assign(state.settings, defaults.settings); state.commentMode = 'Raw'; persistSafeSettings(); markAction('Settings reset locally'); render(); }], ['Cancel', () => markAction('Cancel (mock)')], ['Save', () => { persistSafeSettings(); markAction('Settings saved locally'); render(); }]].forEach(([label, fn]) => { const b = el('button', label); b.onclick = fn; bar.append(b); });
  p.append(bar, el('p', state.report.statusMessage || ''), languageToggle()); m.append(p); return m; }

function reportScreen() { const m = el('section', undefined, 'main'); const p = el('section', undefined, 'panel');
  const e = el('div', undefined, 'toolbar');
  const report = el('button', t('downloadReport')); report.onclick = () => safeDownload('report.json', JSON.stringify({ screen: state.screen, language: state.language, commentMode: state.commentMode, stability: state.stability, prepare: { selectedSource: state.prepare.selectedSource, selectedPlatform: state.prepare.selectedPlatform, selectedPreset: state.prepare.selectedPreset, rtmpUrl: state.prepare.rtmpUrl, validationStatus: state.prepare.validationStatus }, streamKeySaved: false }, null, 2));
  const logs = el('button', t('downloadLogs')); logs.onclick = () => safeDownload('logs.json', JSON.stringify([{ level: 'info', message: 'local mock log' }, { level: 'info', message: state.report.statusMessage || 'idle' }], null, 2));
  const comments = el('button', t('downloadComments')); comments.onclick = () => safeDownload('comments.jsonl', state.comments.map((x) => JSON.stringify(x)).join('\n'));
  p.append(e, report, logs, comments);
  m.append(p); return m; }

const renderMain = () => (state.screen === 'Live' ? liveScreen() : state.screen === 'Prepare' ? prepareScreen() : state.screen === 'Comments' ? commentsScreen() : state.screen === 'Stability' ? stabilityScreen() : state.screen === 'Settings' ? settingsScreen() : reportScreen());
function render() { app.textContent = ''; const shell = el('main', undefined, 'shell'); const header = el('header', undefined, 'topbar'); header.append(el('h1', 'SmartLive PC Standalone')); const chips = el('div', undefined, 'header-chips'); ['Validation status', 'Read queued', 'Pinned', 'Done', 'Muted', 'Stream key is not saved'].forEach((x) => chips.append(el('span', x, 'chip'))); header.append(chips, languageToggle()); const legacy = el('div', undefined, 'muted'); legacyTerms.forEach((x)=>legacy.append(el('span', x, 'chip'))); header.append(legacy); shell.append(header); const body = el('div', undefined, 'body'); body.append(sidebar(), renderMain()); shell.append(body); app.append(shell); }
render();
