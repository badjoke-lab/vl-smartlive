const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const saved = JSON.parse(localStorage.getItem('pcStandaloneSettings') || '{}');
const state = {
  mode: 'Radar',
  streamState: 'preview',
  lastError: 'Local sidecar is not connected. Browser bundle remains in preview mode.',
  localSettings: { rtmpUrl: saved.rtmpUrl || '' },
  runtimeSecretPresent: false,
  mediaStream: null,
  micStream: null,
  micEnabled: false,
  sourceType: 'none',
  startTime: Date.now(),
  comments: [
    { time: '12:28:31', author: 'takebon', radar: 'warning', message: 'Audio may be a little quiet.', handled: false, pinned: false },
    { time: '12:28:40', author: 'yuuki', radar: 'question', message: 'Can this be used from a phone too?', handled: false, pinned: false },
    { time: '12:28:55', author: 'sakura', radar: 'praise', message: 'Looks good. Looking forward to the stream.', handled: false, pinned: false },
    { time: '12:29:10', author: 'gamer_cat', radar: 'question', message: 'What settings are being used?', handled: false, pinned: false },
    { time: '12:29:35', author: 'rin', radar: 'praise', message: 'Nice play!', handled: false, pinned: false }
  ],
  logs: []
};

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const validRtmp = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'rtmp:' || url.protocol === 'rtmps:';
  } catch {
    return false;
  }
};

const addLog = (message) => {
  state.logs.unshift(`${new Date().toLocaleTimeString()} ${message}`);
  state.logs = state.logs.slice(0, 24);
};

const safeDownload = (filename, text) => {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const buildReport = () => {
  const elapsedSec = Math.max(0, Math.round((Date.now() - state.startTime) / 1000));
  return {
    appEdition: 'pc-standalone',
    generatedAt: new Date().toISOString(),
    mode: state.mode,
    streamState: state.streamState,
    sourceType: state.sourceType,
    micEnabled: state.micEnabled,
    rtmpTargetValid: validRtmp(state.localSettings.rtmpUrl),
    runtimeSecretEntered: state.runtimeSecretPresent,
    runtimeSecretSaved: false,
    durationSec: elapsedSec,
    commentSummary: {
      total: state.comments.length,
      questions: state.comments.filter((comment) => comment.radar === 'question').length,
      warnings: state.comments.filter((comment) => comment.radar === 'warning').length,
      praise: state.comments.filter((comment) => comment.radar === 'praise').length,
      handled: state.comments.filter((comment) => comment.handled).length,
      pinned: state.comments.filter((comment) => comment.pinned).length
    },
    logs: state.logs
  };
};

const buildCommentsJsonl = () => state.comments.map((comment, index) => JSON.stringify({
  schemaVersion: 'smartlive.log.v0.1',
  appEdition: 'pc-standalone',
  line: index + 1,
  timestamp: comment.time,
  displayName: comment.author,
  text: comment.message,
  labels: [comment.radar],
  handled: comment.handled,
  pinned: comment.pinned
})).join('\n') + '\n';

const validateTarget = () => {
  const ok = validRtmp(state.localSettings.rtmpUrl);
  addLog(ok ? 'RTMP/RTMPS target validated locally.' : 'RTMP/RTMPS target validation failed.');
  state.streamState = ok ? 'ready' : 'preview';
  render();
};

async function requestCamera() {
  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    state.sourceType = 'camera';
    addLog('Camera source ready.');
  } catch {
    addLog('Camera permission denied or unavailable.');
  }
  render();
}

async function requestScreen() {
  try {
    state.mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    state.sourceType = 'screen/window';
    addLog('Screen/window source ready.');
  } catch {
    addLog('Screen/window permission denied or unavailable.');
  }
  render();
}

async function requestMic() {
  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micEnabled = true;
    addLog('Microphone source ready.');
  } catch {
    state.micEnabled = false;
    addLog('Microphone permission denied or unavailable.');
  }
  render();
}

function addComment(author, message, radar) {
  if (!message.trim()) {
    addLog('Comment add skipped: empty message.');
    render();
    return;
  }
  state.comments.unshift({
    time: new Date().toLocaleTimeString(),
    author: author.trim() || 'guest',
    radar,
    message: message.trim(),
    handled: false,
    pinned: false
  });
  addLog(`Comment added as ${radar}.`);
  render();
}

function renderComments() {
  const list = el('div', undefined, 'comment-list');
  const comments = state.mode === 'Raw' ? state.comments : [...state.comments].sort((a, b) => {
    const order = { warning: 0, question: 1, praise: 2, general: 3 };
    return order[a.radar] - order[b.radar];
  });
  comments.forEach((comment) => {
    const item = el('article', undefined, `comment-item ${comment.radar}`);
    item.append(el('span', comment.time, 'comment-time'));
    item.append(el('strong', `${comment.author} · ${comment.radar}${comment.pinned ? ' · pinned' : ''}${comment.handled ? ' · done' : ''}`, 'comment-author'));
    item.append(el('p', comment.message));
    const read = el('button', 'Read');
    read.onclick = () => { addLog(`Read queue: ${comment.author}`); render(); };
    const pin = el('button', comment.pinned ? 'Unpin' : 'Pin');
    pin.onclick = () => { comment.pinned = !comment.pinned; addLog(comment.pinned ? 'Comment pinned.' : 'Comment unpinned.'); render(); };
    const done = el('button', comment.handled ? 'Undo' : 'Done');
    done.onclick = () => { comment.handled = !comment.handled; addLog(comment.handled ? 'Comment marked done.' : 'Comment reopened.'); render(); };
    item.append(read, pin, done);
    list.append(item);
  });
  return list;
}

function render() {
  app.textContent = '';
  const shell = el('main', undefined, 'pc-shell');

  const header = el('header', undefined, 'pc-topbar');
  header.append(el('h1', 'SmartLive Encoder – Standalone'));
  const pills = el('div', undefined, 'top-pills');
  ['YouTube', state.streamState === 'ready' ? 'Ready' : 'Preview', '00:18:42', 'Stable mode'].forEach((label) => pills.append(el('span', label)));
  const stop = el('button', 'Stop preview', 'danger-button');
  stop.onclick = () => { state.streamState = 'preview'; addLog('Preview stopped locally.'); render(); };
  pills.append(stop);
  header.append(pills);
  shell.append(header);

  const grid = el('section', undefined, 'pc-grid');

  const preview = el('section', undefined, 'panel preview-panel');
  preview.append(el('div', 'LIVE', 'live-badge'));
  preview.append(el('h2', 'Source preview'));
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  if (state.mediaStream) video.srcObject = state.mediaStream;
  preview.append(video);
  const sourceActions = el('div', undefined, 'button-row');
  [['Use camera', requestCamera], ['Use screen/window', requestScreen], ['Enable microphone', requestMic]].forEach(([label, handler]) => {
    const button = el('button', label);
    button.onclick = handler;
    sourceActions.append(button);
  });
  preview.append(sourceActions);
  grid.append(preview);

  const comments = el('section', undefined, 'panel comments-panel');
  const commentHead = el('div', undefined, 'section-head');
  commentHead.append(el('h2', 'Comments'));
  const tabs = el('div', undefined, 'tab-row');
  ['Raw', 'Radar'].forEach((mode) => {
    const button = el('button', mode, state.mode === mode ? 'active' : '');
    button.onclick = () => { state.mode = mode; addLog(`Comment mode changed to ${mode}.`); render(); };
    tabs.append(button);
  });
  commentHead.append(tabs);
  comments.append(commentHead, renderComments());
  const form = el('div', undefined, 'comment-input');
  const author = document.createElement('input');
  author.placeholder = 'author';
  const message = document.createElement('input');
  message.placeholder = 'comment message';
  const radar = document.createElement('select');
  ['question', 'warning', 'praise', 'general'].forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    radar.append(option);
  });
  const submit = el('button', 'Add comment');
  submit.onclick = () => addComment(author.value, message.value, radar.value);
  form.append(author, message, radar, submit);
  comments.append(form);
  grid.append(comments);

  const setup = el('section', undefined, 'panel setup-panel');
  setup.append(el('h2', 'Stream target setup'));
  const urlInput = document.createElement('input');
  urlInput.placeholder = 'rtmp://... or rtmps://...';
  urlInput.value = state.localSettings.rtmpUrl;
  urlInput.oninput = (event) => {
    state.localSettings.rtmpUrl = event.target.value;
    localStorage.setItem('pcStandaloneSettings', JSON.stringify({ rtmpUrl: state.localSettings.rtmpUrl }));
  };
  const keyInput = document.createElement('input');
  keyInput.type = 'password';
  keyInput.placeholder = 'runtime stream key (not saved)';
  keyInput.oninput = (event) => { state.runtimeSecretPresent = Boolean(event.target.value); };
  const validateButton = el('button', 'Validate target locally');
  validateButton.onclick = validateTarget;
  const valid = el('p', `Target valid: ${validRtmp(state.localSettings.rtmpUrl) ? 'yes' : 'no'} · runtime key saved: no`, 'status-line');
  setup.append(urlInput, keyInput, validateButton, valid);
  grid.append(setup);

  const status = el('section', undefined, 'panel status-panel');
  status.append(el('h2', 'Status'));
  [
    ['sidecar reachable', 'no'],
    ['source selected', state.sourceType === 'none' ? 'no' : state.sourceType],
    ['microphone', state.micEnabled ? 'enabled' : 'optional'],
    ['target valid', validRtmp(state.localSettings.rtmpUrl) ? 'yes' : 'no'],
    ['runtime key saved', 'no'],
    ['final state', state.streamState]
  ].forEach(([label, value]) => {
    const row = el('p');
    row.append(el('span', label));
    row.append(el('strong', value));
    status.append(row);
  });
  status.append(el('small', state.lastError));
  grid.append(status);

  const metrics = el('section', undefined, 'metrics-row');
  [
    ['Audio', state.micEnabled ? 'OK' : 'Idle'],
    ['Upload', '3.2 Mbps'],
    ['Bitrate', '4,200 kbps'],
    ['Drop', '0%'],
    ['CPU', '18%'],
    ['Viewers', '128']
  ].forEach(([label, value]) => {
    const card = el('article', undefined, 'metric');
    card.append(el('span', label));
    card.append(el('b', value));
    metrics.append(card);
  });
  grid.append(metrics);

  const log = el('section', undefined, 'panel log-panel');
  log.append(el('h2', 'Runtime log'));
  const exportLogs = el('button', 'Download logs.json');
  exportLogs.onclick = () => safeDownload('pc-standalone-logs.json', JSON.stringify({ appEdition: 'pc-standalone', generatedAt: new Date().toISOString(), logs: state.logs }, null, 2));
  log.append(exportLogs);
  if (state.logs.length === 0) log.append(el('p', state.lastError));
  state.logs.forEach((line) => log.append(el('p', line)));
  grid.append(log);

  const report = el('section', undefined, 'panel report-panel');
  report.append(el('h2', 'Report preview'));
  const reportData = buildReport();
  const exportReport = el('button', 'Download report.json');
  exportReport.onclick = () => safeDownload('pc-standalone-report.json', JSON.stringify(buildReport(), null, 2));
  const exportComments = el('button', 'Download comments.jsonl');
  exportComments.onclick = () => safeDownload('pc-standalone-comments.jsonl', buildCommentsJsonl());
  report.append(exportReport, exportComments);
  [
    `generatedAt: ${reportData.generatedAt}`,
    `source type: ${reportData.sourceType}`,
    `mic enabled: ${reportData.micEnabled ? 'yes' : 'no'}`,
    `target valid: ${reportData.rtmpTargetValid ? 'yes' : 'no'}`,
    `runtime key saved: no`,
    `comments: ${reportData.commentSummary.total}`,
    `summary: ${reportData.streamState}`
  ].forEach((line) => report.append(el('p', line)));
  grid.append(report);

  shell.append(grid);
  app.append(shell);
}

addLog(state.lastError);
render();
