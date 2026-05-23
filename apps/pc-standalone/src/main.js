const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const saved = JSON.parse(localStorage.getItem('pcStandaloneSettings') || '{}');
const state = {
  mode: 'Radar',
  streamState: 'error',
  lastError: 'Local sidecar unreachable. Run pnpm run dev:pc-standalone.',
  localSettings: { rtmpUrl: saved.rtmpUrl || '' },
  mediaStream: null,
  micStream: null,
  micEnabled: false,
  sourceType: 'none',
  startTime: 0,
  comments: [
    { time: '12:28:31', author: 'takebon', radar: 'warning', message: 'Audio may be a little quiet.' },
    { time: '12:28:40', author: 'yuuki', radar: 'question', message: 'Can this be used from a phone too?' },
    { time: '12:28:55', author: 'sakura', radar: 'praise', message: 'Looks good. Looking forward to the stream.' },
    { time: '12:29:10', author: 'gamer_cat', radar: 'question', message: 'What settings are being used?' },
    { time: '12:29:35', author: 'rin', radar: 'praise', message: 'Nice play!' }
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
  state.logs = state.logs.slice(0, 8);
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

function renderComments() {
  const list = el('div', undefined, 'comment-list');
  const comments = state.mode === 'Raw' ? state.comments : [...state.comments].sort((a, b) => {
    const order = { warning: 0, question: 1, praise: 2 };
    return order[a.radar] - order[b.radar];
  });
  comments.forEach((comment) => {
    const item = el('article', undefined, `comment-item ${comment.radar}`);
    item.append(el('span', comment.time, 'comment-time'));
    item.append(el('strong', `${comment.author} · ${comment.radar}`, 'comment-author'));
    item.append(el('p', comment.message));
    item.append(el('button', 'Read'));
    item.append(el('button', 'Pin'));
    item.append(el('button', 'Done'));
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
  ['YouTube', state.streamState === 'live' ? 'Streaming' : 'Preview', '00:18:42', 'Stable mode'].forEach((label) => pills.append(el('span', label)));
  const stop = el('button', 'Stop streaming', 'danger-button');
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
    button.onclick = () => { state.mode = mode; render(); };
    tabs.append(button);
  });
  commentHead.append(tabs);
  comments.append(commentHead, renderComments());
  const input = el('div', 'Comment input is disabled in local preview mode.', 'comment-input');
  comments.append(input);
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
  keyInput.placeholder = 'stream key/password (runtime-only)';
  const valid = el('p', `Target valid: ${validRtmp(state.localSettings.rtmpUrl) ? 'yes' : 'no'}`, 'status-line');
  setup.append(urlInput, keyInput, valid);
  grid.append(setup);

  const status = el('section', undefined, 'panel status-panel');
  status.append(el('h2', 'Status'));
  [
    ['sidecar reachable', 'no'],
    ['source selected', state.sourceType === 'none' ? 'no' : state.sourceType],
    ['microphone', state.micEnabled ? 'enabled' : 'optional'],
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
  if (state.logs.length === 0) log.append(el('p', state.lastError));
  state.logs.forEach((line) => log.append(el('p', line)));
  grid.append(log);

  const report = el('section', undefined, 'panel report-panel');
  report.append(el('h2', 'Report preview'));
  ['startedAt: n/a', 'stoppedAt: n/a', 'duration: 0s', `source type: ${state.sourceType}`, `mic enabled: ${state.micEnabled ? 'yes' : 'no'}`, `summary: ${state.streamState}`].forEach((line) => report.append(el('p', line)));
  grid.append(report);

  shell.append(grid);
  app.append(shell);
}

addLog(state.lastError);
render();
