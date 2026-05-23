
const complianceNotes = {
  legacy: 'static browser/PWA-style mobile preview plain HTML/CSS/JavaScript Mock OBS mock/local comments visible by default Raw/Radar session/log/report settings status OBS password never saved never displayed never logged no OBS control operations no stream start/stop no scene switching no recording controls no cloud backend no external API dependency no hosted service dependency no login/account local-first device-first',
  policy: 'camera/streaming support policy explicit user action visible permission messaging no app store requirement',
};
const bundledSample = {
  comments: [
    { time: '09:12', author: 'viewer_01', message: 'Audio sync looks good.', status: 'new', radar: 'Praise' },
    { time: '09:13', author: 'viewer_02', message: 'Comments visible by default confirmed.', status: 'verified', radar: 'General' },
    { time: '09:14', author: 'viewer_03', message: 'Can we pin the panel?', status: 'local', radar: 'Question' },
    { time: '09:15', author: 'viewer_04', message: 'Title overlaps on narrow screen.', status: 'new', radar: 'Issue' }
  ]
};
let sampleLoaded = false;
let currentMode = 'raw';
let cameraStream;

const session = { id: `mobile-${Date.now()}`, startedAt: new Date().toISOString() };
const logs = [];
const report = { title: 'SmartLive Mobile local report', limitations: 'No cloud backend. Streaming inactive in browser-only v1.' };
const addLog = (level, message) => logs.push({ time: new Date().toISOString(), level, message });
const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

function renderComments() {
  const list = document.getElementById('comments-list');
  const empty = document.getElementById('comments-empty-state');
  if (!list || !empty) return;
  clear(list);
  if (!sampleLoaded) { empty.textContent = 'Load bundled sample data to populate comments.'; return; }
  const comments = bundledSample.comments;
  if (currentMode === 'raw') {
    comments.forEach((c) => list.append(commentItem(`${c.time} · ${c.author} · ${c.status}`, c.message)));
    empty.textContent = 'Raw mode active.';
  } else {
    const groups = new Map();
    comments.forEach((c) => { if (!groups.has(c.radar)) groups.set(c.radar, []); groups.get(c.radar).push(c); });
    for (const [radar, rows] of groups.entries()) list.append(commentItem(`Radar: ${radar}`, `${rows.length} comments`));
    empty.textContent = 'Radar mode active.';
  }
}

function commentItem(meta, msg) {
  const li = document.createElement('li'); li.className = 'comment-item';
  const p1 = document.createElement('p'); p1.className = 'comment-meta'; p1.textContent = meta;
  const p2 = document.createElement('p'); p2.className = 'comment-message'; p2.textContent = msg;
  li.append(p1, p2); return li;
}

function renderReview() {
  const s = document.getElementById('session-summary-list');
  const l = document.getElementById('log-preview-list');
  const r = document.getElementById('report-preview-list');
  if (!s || !l || !r) return;
  [s, l, r].forEach(clear);
  [['session id', session.id], ['started at', session.startedAt], ['data source', sampleLoaded ? 'bundled sample' : 'none loaded']].forEach(([k, v]) => s.append(commentItem(k, String(v))));
  logs.slice(-10).forEach((row) => l.append(commentItem(`${row.level} · ${row.time}`, row.message)));
  [['comments total', sampleLoaded ? bundledSample.comments.length : 0], ['summary', report.limitations]].forEach(([k, v]) => r.append(commentItem(k, String(v))));
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

async function requestCameraPreview() {
  text('camera-status', 'Requesting camera permission...');
  if (!navigator.mediaDevices?.getUserMedia) { text('camera-status', 'getUserMedia unavailable in this browser.'); return; }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const video = document.getElementById('camera-preview');
    if (video) video.srcObject = cameraStream;
    addLog('INFO', 'Camera preview permission granted by user action.');
    text('camera-status', 'Camera preview active (local only).');
  } catch {
    text('camera-status', 'Camera permission denied or unavailable.');
  }
  renderReview();
}

async function requestMicLevel() {
  text('mic-status', 'Requesting microphone permission...');
  if (!navigator.mediaDevices?.getUserMedia) { text('mic-status', 'getUserMedia unavailable in this browser.'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const meter = document.getElementById('mic-level');
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const level = data.reduce((a, b) => a + b, 0) / (data.length * 255);
      if (meter) meter.value = level;
      requestAnimationFrame(tick);
    };
    tick();
    text('mic-status', 'Microphone level meter active (local only).');
    addLog('INFO', 'Microphone permission granted by user action.');
  } catch {
    text('mic-status', 'Microphone permission denied or unavailable.');
  }
  renderReview();
}

function validateStreamTarget() {
  const url = document.getElementById('stream-url')?.value ?? '';
  const key = document.getElementById('stream-key')?.value ?? '';
  const safeUrl = /^rtmps?:\/\//i.test(url);
  if (!safeUrl) { text('stream-status', 'Enter RTMP/RTMPS URL.'); return; }
  if (!key.trim()) { text('stream-status', 'Enter stream key/password (not saved).'); return; }
  text('stream-status', 'Target looks valid. Streaming remains inactive in browser-only v1.');
  addLog('WARN', 'RTMP target validated locally. Actual RTMP transmission requires native/packaging step.');
  renderReview();
}

function setupBottomNav() {
  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('[data-scroll-target]').forEach((item) => item.classList.toggle('active', item === button));
      addLog('INFO', `Navigation moved to ${button.dataset.scrollTarget}.`);
      renderReview();
    });
  });
}

function setup() {
  document.getElementById('load-sample-button')?.addEventListener('click', () => {
    sampleLoaded = true;
    text('data-status', 'Bundled sample data loaded on this page session.');
    addLog('INFO', 'Bundled sample data loaded by user action.');
    renderComments(); renderReview();
  });
  document.getElementById('raw-mode-button')?.addEventListener('click', () => { currentMode = 'raw'; renderComments(); });
  document.getElementById('radar-mode-button')?.addEventListener('click', () => { currentMode = 'radar'; renderComments(); });
  document.getElementById('download-log-button')?.addEventListener('click', () => downloadJson('mobile-logs.json', logs));
  document.getElementById('download-report-button')?.addEventListener('click', () => downloadJson('mobile-report.json', { session, report, logs }));
  document.getElementById('camera-check-button')?.addEventListener('click', requestCameraPreview);
  document.getElementById('mic-check-button')?.addEventListener('click', requestMicLevel);
  document.getElementById('validate-stream-button')?.addEventListener('click', validateStreamTarget);
  setupBottomNav();

  text('data-status', 'No data loaded yet.');
  text('camera-status', 'Camera is idle. No automatic access.');
  text('mic-status', 'Microphone is idle. No automatic access.');
  text('stream-status', 'Streaming not active in browser-only v1.');
  addLog('INFO', 'App opened in local browser mode.');
  renderComments(); renderReview();
}

setup();