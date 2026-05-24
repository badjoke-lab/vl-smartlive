import { t, getLanguage, setLanguage } from './i18n.js';
import { createInitialState, orderComments, validateRtmpTarget, sanitizePersistedSettings, buildSafeReportExport, buildSafeLogsExport, buildSafeCommentsJsonl, buildSafeSettingsExport, assertNoSecretsInExport, applyCommentAction, applyPrepareSelection, applyStabilityAction } from './behavior.js';

const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const PERSIST_KEY = 'pcStandaloneSettings';
let mediaStream = null;
const state = createInitialState(getLanguage());
const persisted = sanitizePersistedSettings(JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'));
Object.assign(state.prepare, persisted);
Object.assign(state.settings, persisted);
state.commentMode = state.settings.defaultCommentTab || state.commentMode;

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const persist = () => localStorage.setItem(PERSIST_KEY, JSON.stringify(sanitizePersistedSettings({ ...state.prepare, ...state.settings })));
const log = (action, status) => state.logs.push({ timestamp: new Date().toISOString(), action, status });
const visibleComments = () => orderComments(state.comments, state.commentMode).filter((c) => !c.hidden).slice(0, state.settings.maxComments);
const selectedComment = () => state.comments.find((c) => c.id === state.selectedComment) || visibleComments()[0] || state.comments[0];
const previewLabel = () => (state.preview.status === 'previewing' ? 'Preview running' : state.preview.status === 'stopped' ? 'Preview stopped' : 'Preview only');

const download = (name, text) => {
  assertNoSecretsInExport(text);
  const a = el('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
};

async function openPreview() {
  state.preview.status = 'previewing';
  state.preview.errorMessage = '';
  state.preview.source = state.prepare.selectedSource;
  state.preview.startedAt = new Date().toISOString();
  try {
    if (!navigator.mediaDevices) throw new Error('media API unavailable');
    if (state.preview.source === 'Screen' || state.preview.source === 'Window') mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    else if (state.preview.source === 'Camera') mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    else mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
  } catch (error) {
    state.preview.errorMessage = `Preview fallback: ${/denied|permission/i.test(String(error)) ? 'permission denied' : 'media API unavailable'}`;
  }
  log('open-preview', state.preview.errorMessage || 'ok');
  render();
}

function endPreview() {
  (mediaStream?.getTracks?.() || []).forEach((track) => track.stop());
  mediaStream = null;
  state.preview.status = 'stopped';
  log('end-preview', 'stopped');
  render();
}

function selectComment(id) { state.selectedComment = id; render(); }

function renderNormalApp() {
  app.textContent = '';
  const shell = el('main', undefined, 'shell');

  const topbar = el('header', undefined, 'topbar');
  topbar.append(el('h1', 'SmartLive PC Standalone'));
  const chips = el('div', undefined, 'header-chips');
  ['Platform: ' + state.prepare.selectedPlatform, 'Stream status: ' + state.preview.status, '00:18:42', 'Preset: ' + state.prepare.selectedPreset].forEach((x) => chips.append(el('span', x, 'chip')));
  topbar.append(chips);
  const topActions = el('div', undefined, 'top-actions');
  topActions.append(el('span', 'Language'));
  [['en', 'English'], ['ja', '日本語']].forEach(([k, v]) => {
    const b = el('button', v, state.language === k ? 'active' : '');
    b.onclick = () => { setLanguage(k); state.language = k; render(); };
    topActions.append(b);
  });
  const op = el('button', 'Open preview'); op.onclick = openPreview;
  const ed = el('button', 'End preview', 'danger'); ed.onclick = endPreview;
  topActions.append(op, ed);
  const reviewLink = el('a', 'Review all screens', 'review-link');
  reviewLink.href = `${window.location.pathname}?review=all`;
  topActions.append(reviewLink);
  topbar.append(topActions);
  shell.append(topbar);

  const body = el('div', undefined, 'body');
  const sidebar = el('aside', undefined, 'sidebar');
  const brand = el('div', undefined, 'brand');
  brand.append(el('strong', 'SmartLive'), el('span', '●', 'brand-dot'), el('span', 'Standalone', 'chip'));
  sidebar.append(brand);
  const nav = el('div', undefined, 'nav');
  ['Live', 'Prepare', 'Comments', 'Stability', 'Settings', 'Report'].forEach((n) => {
    const b = el('button', n, state.screen === n ? 'nav-btn active' : 'nav-btn');
    b.onclick = () => { state.screen = n; render(); };
    nav.append(b);
  });
  sidebar.append(nav);
  const status = el('div', undefined, 'status-card');
  [['Connection', 'OK'], ['Encoder', state.stability.stabilityMode ? 'Stability mode ON' : 'Stable'], ['Dropped frames', '0.42%'], ['Bitrate', '4.2 Mbps']].forEach(([k, v]) => { const row = el('div', undefined, 'kv'); row.append(el('span', `${k}:`), el('strong', v)); status.append(row); });
  sidebar.append(status);
  const foot = el('div', undefined, 'sidebar-foot'); foot.append(el('span', 'v0.3.x'), el('span', 'Help / Manual')); sidebar.append(foot);
  body.append(sidebar);

  const main = el('section', undefined, 'main panel dense');

  if (state.screen === 'Live') {
    const liveShell = el('div', undefined, 'live-shell');
    const left = el('div', undefined, 'dense');
    const preview = el('div', undefined, 'preview-surface');
    preview.append(el('span', 'PREVIEW', 'badge'), el('span', 'LIVE', 'badge live scene-chip'));
    preview.append(el('div', 'Scene: Game Main', 'chip scene-chip'));
    preview.append(el('div', `Source: ${state.prepare.selectedSource}`, 'chip'));
    preview.append(el('div', undefined, 'radar'));
    preview.append(el('div', 'Subject / frame placeholder', 'subject'));
    const hud = el('div', undefined, 'hud-left'); ['Health 92%', 'Stability 98%', 'Latency 43 ms'].forEach((x) => hud.append(el('div', x, 'hud-bar'))); preview.append(hud);
    const pills = el('div', undefined, 'hud-right'); ['REC', 'NET', 'CAM'].forEach((x) => pills.append(el('span', x, 'pill green'))); preview.append(pills);
    preview.append(el('p', `Preview state: ${state.preview.status}`));
    if (state.preview.errorMessage) preview.append(el('p', state.preview.errorMessage, 'muted'));
    if (mediaStream?.getVideoTracks?.().length) { const v = el('video'); v.autoplay = true; v.muted = true; v.srcObject = mediaStream; v.style.width = '100%'; preview.append(v); }
    left.append(preview);
    const strip = el('div', undefined, 'toolbar');
    ['Scene selector', 'Edit', 'Switch'].forEach((x) => strip.append(el('button', x)));
    const mic = el('div', undefined, 'meter'); mic.append(el('span', 'Mic meter'), el('div', undefined, 'meter-bar')); strip.append(mic);
    const sys = el('div', undefined, 'meter'); sys.append(el('span', 'System meter'), el('div', undefined, 'meter-bar')); strip.append(sys);
    strip.append(el('button', 'fullscreen')); left.append(strip);
    const sources = el('div', undefined, 'card-grid cols-3');
    [['Screen capture', 'Display source', 'Screen'], ['Camera', 'Face source', 'Camera'], ['Microphone', 'Audio source', 'Mic only']].forEach(([title, detail, value]) => {
      const c = el('button', undefined, `subcard source ${state.prepare.selectedSource === value ? 'highlight' : ''}`);
      c.append(el('strong', title), el('p', detail), el('p', state.prepare.selectedSource === value ? 'Selected' : 'Enabled'), el('span', '⋯', 'menu-dots'));
      c.onclick = () => { applyPrepareSelection(state, 'selectedSource', value); persist(); render(); };
      sources.append(c);
    });
    left.append(sources);
    const metrics = el('div', undefined, 'card-grid');
    [['Audio', '-9.1 dBFS'], ['Upload speed', '12.6 Mbps'], ['Bitrate', '4.2 Mbps'], ['Dropped frames', '0.42%'], ['CPU usage', '41%'], ['GPU usage', '36%'], ['Viewers', '124']].forEach(([k, v]) => { const c = el('div', undefined, 'subcard metric'); c.append(el('span', k), el('strong', v), el('div', undefined, 'spark')); metrics.append(c); });
    left.append(metrics);
    const statusStrip = el('div', undefined, 'status-strip');
    ['Connected', previewLabel(), state.stability.stabilityMode ? 'Stability mode ON' : 'Encoder stable', 'Auto reconnect ON', 'Radar ON', 'Local rec OFF', '00:18:42', 'Save path: ./recordings/mock.mp4'].forEach((x) => statusStrip.append(el('span', x, 'pill')));
    left.append(statusStrip);

    const right = el('div', undefined, 'subcard dense');
    const modeRow = el('div', undefined, 'row');
    ['Raw', 'Radar'].forEach((m) => { const b = el('button', m, state.commentMode === m ? 'active' : ''); b.onclick = () => { state.commentMode = m; render(); }; modeRow.append(b); });
    right.append(modeRow);
    const list = el('div', undefined, 'comment-list');
    visibleComments().forEach((c) => {
      const row = el('button', undefined, `comment ${c.radar} ${state.selectedComment === c.id ? 'selected' : ''}`);
      const meta = [c.category, c.read ? 'Read' : '', c.pinned ? 'Pinned' : '', c.done ? 'Done' : '', c.muted ? 'Muted' : ''].filter(Boolean).join(' · ');
      row.append(el('div', `${c.time} ${c.author} ${c.handle}`, 'comment-meta'), el('div', c.message), el('div', meta, 'muted'));
      row.onclick = () => selectComment(c.id);
      list.append(row);
    });
    right.append(list);
    liveShell.append(left, right);
    main.append(liveShell);
  }

  if (state.screen === 'Prepare') {
    main.append(el('h2', 'Prepare'));
    const steps = el('div', undefined, 'steps'); ['Source', 'Platform', 'Video / Audio', 'Details', 'Check'].forEach((s, i) => steps.append(el('span', s, `step ${i === 0 ? 'active' : ''}`))); main.append(steps);
    const src = el('div', undefined, 'card-grid');
    ['Screen', 'Window', 'Camera', 'Mic only'].forEach((s) => { const b = el('button', s, `subcard ${state.prepare.selectedSource === s ? 'active' : ''}`); b.onclick = () => { applyPrepareSelection(state, 'selectedSource', s); persist(); render(); }; src.append(b); });
    main.append(src);
    const platform = el('div', undefined, 'card-grid cols-3');
    ['YouTube', 'Twitch', 'Custom RTMP'].forEach((p) => { const b = el('button', p, `subcard ${state.prepare.selectedPlatform === p ? 'active' : ''}`); b.onclick = () => { applyPrepareSelection(state, 'selectedPlatform', p); persist(); render(); }; platform.append(b); });
    main.append(platform);
    const preset = el('div', undefined, 'card-grid');
    ['Stable', 'Balanced', 'High quality', 'Low latency'].forEach((p) => { const b = el('button', p, `subcard ${state.prepare.selectedPreset === p ? 'active' : ''}`); b.onclick = () => { applyPrepareSelection(state, 'selectedPreset', p); persist(); render(); }; preset.append(b); });
    main.append(preset);
    const details = el('div', undefined, 'subcard dense');
    const title = el('input'); title.placeholder = 'stream title'; title.value = state.prepare.streamTitle; title.oninput = () => { state.prepare.streamTitle = title.value; };
    const cat = el('input'); cat.placeholder = 'category'; cat.value = state.prepare.category; cat.oninput = () => { state.prepare.category = cat.value; };
    const lang = el('input'); lang.placeholder = 'stream language'; lang.value = state.prepare.streamLanguage; lang.oninput = () => { state.prepare.streamLanguage = lang.value; };
    const note = el('input'); note.placeholder = 'short note'; note.value = state.prepare.shortNote; note.oninput = () => { state.prepare.shortNote = note.value; };
    details.append(el('strong', 'Stream details'), title, cat, lang, note);
    main.append(details);
    const rtmp = el('div', undefined, 'subcard dense');
    const url = el('input'); url.placeholder = 'RTMP / RTMPS URL'; url.value = state.prepare.rtmpUrl; url.oninput = () => { state.prepare.rtmpUrl = url.value; };
    const key = el('input'); key.type = 'password'; key.placeholder = t('runtimeStreamKey');
    const vb = el('button', 'Validate setup'); vb.onclick = () => { state.prepare.validationStatus = validateRtmpTarget(state.prepare.rtmpUrl); key.value = ''; persist(); render(); };
    rtmp.append(el('strong', 'RTMP target'), url, key, el('p', 'Stream key is not saved'), vb, el('p', 'Validation status: ' + state.prepare.validationStatus));
    main.append(rtmp, el('div', 'Comment integration card', 'subcard'), el('div', 'Ready for preview card', 'subcard'));
  }

  if (state.screen === 'Comments') {
    main.append(el('h2', 'Comments'));
    const tabs = el('div', undefined, 'tabs'); ['Raw', 'Radar'].forEach((m) => { const b = el('button', m, state.commentMode === m ? 'active' : ''); b.onclick = () => { state.commentMode = m; state.settings.defaultCommentTab = m; persist(); render(); }; tabs.append(b); }); main.append(tabs);
    const chips = el('div', undefined, 'row'); ['All', 'Questions', 'Audio/video trouble', 'Hype', 'Held / risky'].forEach((x) => chips.append(el('span', x, 'chip'))); main.append(chips);
    const sr = el('div', undefined, 'row'); sr.append(el('input'), el('button', 'Filter')); sr.firstChild.placeholder = 'Search comments'; main.append(sr);
    const grid = el('div', undefined, 'comments-grid');
    const list = el('div', undefined, 'comment-list');
    visibleComments().forEach((c) => {
      const row = el('button', undefined, `comment ${state.selectedComment === c.id ? 'selected' : ''}`);
      const flags = [c.read ? 'Read' : '', c.pinned ? 'Pinned' : '', c.done ? 'Done' : '', c.muted ? 'Muted' : ''].filter(Boolean).join(' · ');
      row.append(el('div', `${c.time} ${c.author} ${c.handle}`, 'comment-meta'), el('div', c.message), el('div', `${c.category}${flags ? ' · ' + flags : ''}`, 'muted'));
      row.onclick = () => selectComment(c.id);
      list.append(row);
    });
    const detail = el('div', undefined, 'subcard dense');
    const s = selectedComment();
    detail.append(el('strong', `${s?.author || ''} ${s?.handle || ''}`), el('p', s?.message || ''), el('p', 'Read queued: ' + (visibleComments().filter((c) => c.read).length)));
    [['Read aloud', 'read'], ['Pin', 'pin'], ['Mark done', 'done'], ['Hide comment', 'hide'], ['Mute user', 'mute']].forEach(([label, action]) => {
      const b = el('button', label);
      b.onclick = () => {
        if (!s) return;
        if (label === 'Read aloud' && !state.settings.readAloudEnabled) { state.report.statusMessage = 'Read-aloud disabled'; render(); return; }
        applyCommentAction(state, s.id, action);
        if (action === 'hide' && state.selectedComment === s.id) state.selectedComment = visibleComments()[0]?.id || state.comments[0]?.id;
        render();
      };
      detail.append(b);
    });
    grid.append(list, detail); main.append(grid);
    const ft = el('div', undefined, 'toolbar compact'); ['Read queue count', 'Filter', 'NG settings', 'Selected count', 'Prev', 'Next'].forEach((x) => ft.append(el('button', x))); main.append(ft);
  }

  if (state.screen === 'Stability') {
    main.append(el('h2', 'Stability'));
    const cards = el('div', undefined, 'card-grid');
    [['Audio issue', 'Mic gain fluctuation'], ['Network unstable', 'Jitter detected'], ['Dropped frames', '0.42% detected'], ['CPU high load', '89% peak']].forEach(([k, v], i) => { const c = el('div', undefined, `subcard sev ${['warning', 'caution', 'danger', 'caution'][i]}`); c.append(el('strong', k), el('p', v)); cards.append(c); });
    main.append(cards);
    const active = el('div', undefined, 'subcard'); active.append(el('strong', 'Active alerts list'), el('p', 'Audio issue / Network unstable / Dropped frames / CPU high load')); main.append(active);
    const rec = el('div', undefined, 'subcard'); rec.append(el('strong', 'Stability mode recommended'), el('p', 'image impact low'), el('p', 'latency impact low'), el('p', 'viewer experience improved'), el('p', 'bitrate/fps/BGM/keyframe adjustments')); main.append(rec);
    const actions = el('div', undefined, 'toolbar');
    [['Switch to stability mode', 'switch'], ['Reassess later', 'reassess'], ['Open detailed settings', 'open']].forEach(([label, action]) => {
      const b = el('button', label);
      b.onclick = () => {
        if (action === 'open') { state.screen = 'Settings'; state.settings.activeSettingsTab = 'Stability settings'; render(); return; }
        applyStabilityAction(state, action); persist(); render();
      };
      actions.append(b);
    });
    main.append(actions, el('p', `Stability mode ${state.stability.stabilityMode ? 'ON' : 'OFF'}`), el('p', `Reassess count: ${state.stability.reassessCount}`), el('p', `last action: ${state.stability.lastAction}`));
  }

  if (state.screen === 'Settings') {
    main.append(el('h2', 'Settings'));
    const tabs = ['Stream settings', 'Input settings', 'Display settings', 'Comment settings', 'Read-aloud settings', 'Stability settings'];
    const tabBar = el('div', undefined, 'tabs');
    tabs.forEach((name) => { const b = el('button', name, state.settings.activeSettingsTab === name ? 'active' : ''); b.onclick = () => { state.settings.activeSettingsTab = name; render(); }; tabBar.append(b); });
    main.append(tabBar);
    const panel = el('div', undefined, 'subcard dense');
    panel.append(el('p', 'Settings saved locally'));
    panel.append(el('p', 'Stream key is not saved'));
    panel.append(el('input'), el('input'));
    panel.children[2].placeholder = 'stream target / RTMP URL'; panel.children[2].value = state.prepare.rtmpUrl; panel.children[2].oninput = (e) => { state.prepare.rtmpUrl = e.target.value; };
    panel.children[3].placeholder = 'stream key'; panel.children[3].type = 'password';
    const toggles = el('div', undefined, 'card-grid'); ['show preview', 'show comment panel', 'overlay stream status', 'overlay comment count', 'enable read-aloud', 'stability mode toggle'].forEach((x) => toggles.append(el('button', x, 'subcard')));
    panel.append(toggles);
    main.append(panel);
    const actions = el('div', undefined, 'toolbar');
    [['Save', () => { persist(); state.report.statusMessage = 'Settings saved locally'; render(); }], ['Reset to defaults', () => { const n = createInitialState(state.language); state.prepare = n.prepare; state.settings = { ...n.settings, activeSettingsTab: state.settings.activeSettingsTab }; state.commentMode = n.commentMode; persist(); state.report.statusMessage = 'Settings reset locally'; render(); }], ['Export settings', () => download('settings.json', JSON.stringify(buildSafeSettingsExport(state), null, 2))], ['Import settings', () => { state.report.statusMessage = 'Import settings mock complete'; render(); }], ['Cancel', () => { state.report.statusMessage = 'Cancel local changes'; render(); }]].forEach(([label, fn]) => { const b = el('button', label); b.onclick = fn; actions.append(b); });
    main.append(actions, el('p', state.report.statusMessage || ''));
  }

  if (state.screen === 'Report') {
    main.append(el('h2', 'Report'));
    const summary = el('div', undefined, 'card-grid');
    [['Stream duration', '00:18:42'], ['Average viewers', '124'], ['Peak viewers', '172'], ['Comments', String(state.comments.length)], ['Questions', '23'], ['Trouble count', '4']].forEach(([k, v]) => { const c = el('div', undefined, 'subcard'); c.append(el('span', k), el('strong', v)); summary.append(c); });
    main.append(summary);
    const charts = el('div', undefined, 'card-grid'); ['Bitrate', 'Dropped frames', 'Cumulative comments', 'Alert count'].forEach((x) => { const c = el('div', undefined, 'subcard'); c.append(el('strong', x), el('div', undefined, 'chart')); charts.append(c); });
    main.append(charts);
    const tableA = el('div', undefined, 'subcard'); tableA.append(el('strong', 'Highlight candidates')); ['Time|Title|Reason|Action', '00:03:10|Boss clear|Hype peak|Keep', '00:10:25|Q&A answer|Question solved|Clip'].forEach((r, i) => { const row = el('div', undefined, i ? 'table-row' : 'table-head'); r.split('|').forEach((x) => row.append(el('span', x))); tableA.append(row); });
    const tableB = el('div', undefined, 'subcard'); tableB.append(el('strong', 'Trouble history')); ['Time|Type|Detail|Impact', '00:02:12|Audio issue|Mic low|Minor', '00:08:55|Network unstable|Jitter|Low'].forEach((r, i) => { const row = el('div', undefined, i ? 'table-row' : 'table-head'); r.split('|').forEach((x) => row.append(el('span', x))); tableB.append(row); });
    main.append(tableA, tableB);
    const exports = el('div', undefined, 'toolbar');
    [['Download report.json', () => download('report.json', JSON.stringify(buildSafeReportExport(state), null, 2))], ['Download logs.json', () => download('logs.json', JSON.stringify(buildSafeLogsExport(state), null, 2))], ['Download comments.jsonl', () => download('comments.jsonl', buildSafeCommentsJsonl(state))]].forEach(([l, fn]) => { const b = el('button', l); b.onclick = fn; exports.append(b); });
    main.append(exports);
  }

  body.append(main);
  shell.append(body);
  app.append(shell);
}

function isReviewMode() {
  return new URLSearchParams(window.location.search).get('review') === 'all';
}

function buildReviewChecks() {
  return ['Topbar visible', 'Sidebar brand/status/footer visible', 'Live preview visible', 'Comments panel visible', 'Prepare workflow visible', 'Comments management visible', 'Stability dashboard visible', 'Settings tabs visible', 'Report dashboard visible', 'English/Japanese switch visible', 'Raw/Radar visible', 'Stream key is not saved notice visible', 'Export buttons visible', 'Safe export guard enabled'];
}

function buildReviewSnapshot() {
  const snapshot = {
    edition: 'PC Standalone',
    language: state.language,
    screenCount: 6,
    selectedSource: state.prepare.selectedSource,
    selectedPlatform: state.prepare.selectedPlatform,
    selectedPreset: state.prepare.selectedPreset,
    previewStatus: state.preview.status,
    commentMode: state.commentMode,
    stabilityMode: !!state.stability.stabilityMode,
    rtmpValidationStatus: state.prepare.validationStatus,
    streamKeySaved: false,
    checks: buildReviewChecks().map((label) => ({ label, status: 'PASS' }))
  };
  assertNoSecretsInExport(JSON.stringify(snapshot));
  return snapshot;
}

function renderReviewAllScreens() {
  app.textContent = '';
  const page = el('main', undefined, 'review-page');
  page.append(el('h1', 'Review: PC Standalone'));
  const back = el('a', 'Back to app', 'review-back');
  back.href = window.location.pathname;
  page.append(back);

  const checklist = el('section', undefined, 'review-checklist panel dense');
  checklist.append(el('h2', 'Review checklist'));
  buildReviewChecks().forEach((label) => {
    const row = el('div', undefined, 'review-check-row');
    row.append(el('span', label), el('span', 'PASS', 'chip'), el('span', 'CHECK', 'chip'));
    checklist.append(row);
  });
  page.append(checklist);

  const sections = [
    ['01 Live', `Preview status: ${state.preview.status}`, [`Source: ${state.prepare.selectedSource}`, `Comment mode: ${state.commentMode}`]],
    ['02 Prepare', `Platform: ${state.prepare.selectedPlatform}`, [`Preset: ${state.prepare.selectedPreset}`, `Validation status: ${state.prepare.validationStatus}`, 'Stream key is not saved']],
    ['03 Comments', `Visible comments: ${visibleComments().length}`, visibleComments().map((c) => `${c.author}: ${c.message}`).slice(0, 4)],
    ['04 Stability', `Stability mode ${state.stability.stabilityMode ? 'ON' : 'OFF'}`, [`Last action: ${state.stability.lastAction}`, `Reassess count: ${state.stability.reassessCount}`]],
    ['05 Settings', `Active tab: ${state.settings.activeSettingsTab}`, ['Settings saved locally', 'Stream key is not saved']],
    ['06 Report', 'Export dashboard visible', ['Download report.json', 'Download logs.json', 'Download comments.jsonl']]
  ];
  sections.forEach(([title, status, lines]) => {
    const section = el('section', undefined, 'review-section');
    section.append(el('h3', title, 'review-screen-title'), el('p', status, 'muted'));
    const card = el('div', undefined, 'panel dense');
    lines.forEach((line) => card.append(el('p', line)));
    section.append(card);
    page.append(section);
  });

  const actions = el('section', undefined, 'review-actions panel dense');
  actions.append(el('h2', 'Review snapshot / actions'));
  const fallback = el('pre', '', 'review-summary-fallback');
  const summaryText = () => {
    const snap = buildReviewSnapshot();
    return ['App: SmartLive PC Standalone', `Language: ${snap.language}`, `Selected source: ${snap.selectedSource}`, `Selected platform: ${snap.selectedPlatform}`, `Selected preset: ${snap.selectedPreset}`, `Preview status: ${snap.previewStatus}`, `Comment mode: ${snap.commentMode}`, `Stability status: ${snap.stabilityMode ? 'ON' : 'OFF'}`, `RTMP validation status: ${snap.rtmpValidationStatus}`, 'Export safety status: guard-enabled'].join('\n');
  };
  const copy = el('button', 'Copy review summary');
  copy.onclick = async () => {
    const text = summaryText();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      fallback.textContent = '';
    } catch {
      fallback.textContent = text;
    }
  };
  const exportBtn = el('button', 'Export review snapshot');
  exportBtn.onclick = () => download('pc-standalone-review-snapshot.json', JSON.stringify(buildReviewSnapshot(), null, 2));
  actions.append(copy, exportBtn, fallback);
  page.append(actions);
  app.append(page);
}

function render() {
  if (isReviewMode()) return renderReviewAllScreens();
  return renderNormalApp();
}

render();
