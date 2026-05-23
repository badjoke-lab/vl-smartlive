import { spawn, spawnSync } from 'node:child_process';

const MAX_LOGS = 200;
const state = {
  status: 'idle',
  ffmpegAvailable: false,
  ffmpegVersion: '',
  process: null,
  startedAt: null,
  stoppedAt: null,
  durationMs: 0,
  target: '',
  logs: [],
  lastError: null,
  lastExitCode: null
};

function redactTarget(raw = '') {
  try {
    const u = new URL(raw);
    const parts = (u.pathname || '').split('/').filter(Boolean);
    u.pathname = parts.length ? `/${parts.slice(0, -1).join('/')}/***` : '/***';
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return 'invalid-target';
  }
}

function makeError(code, userMessage, technicalMessage = '') {
  const safeTechnical = technicalMessage && !/rtmp|stream.?key|password|token/i.test(technicalMessage) ? technicalMessage : '';
  const error = { code, message: userMessage, technicalMessage: safeTechnical || undefined };
  state.lastError = { ...error, at: new Date().toISOString() };
  return { ok: false, error };
}

const addLog = (message) => {
  state.logs.push({ time: new Date().toISOString(), message });
  if (state.logs.length > MAX_LOGS) state.logs.shift();
};

export function checkFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  state.ffmpegAvailable = r.status === 0;
  state.ffmpegVersion = state.ffmpegAvailable ? r.stdout.split('\n')[0] : '';
  return { available: state.ffmpegAvailable, version: state.ffmpegVersion };
}

const validTarget = (u) => {
  try {
    const p = new URL(u);
    return p.protocol === 'rtmp:' || p.protocol === 'rtmps:';
  } catch {
    return false;
  }
};

export function getTransmitterStatus() {
  const durationMs = state.startedAt ? ((state.status === 'live' || state.status === 'stopping') ? Date.now() - state.startedAt : state.durationMs) : 0;
  return {
    status: state.status,
    ffmpegAvailable: state.ffmpegAvailable,
    ffmpegVersion: state.ffmpegVersion,
    startedAt: state.startedAt,
    stoppedAt: state.stoppedAt,
    durationMs,
    target: state.target,
    lastError: state.lastError,
    lastExitCode: state.lastExitCode,
    logs: state.logs.slice(-30)
  };
}

export function startTransmitter({ targetUrl, streamKey = '' }) {
  if (state.process) return makeError('already_running', 'Transmitter is already live. Stop current stream first.');
  if (!validTarget(targetUrl)) return makeError('invalid_target', 'Enter a valid RTMP/RTMPS URL before starting.');
  const ff = checkFfmpeg();
  if (!ff.available) return makeError('ffmpeg_missing', 'ffmpeg is not installed or not found on PATH.');

  state.status = 'starting';
  state.lastError = null;
  const outputUrl = streamKey ? `${targetUrl.replace(/\/+$/, '')}/${streamKey}` : targetUrl;
  const redacted = redactTarget(outputUrl);
  state.target = redacted;
  addLog(`starting local transmitter to ${redacted}`);

  let child;
  try {
    child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-re', '-f', 'webm', '-i', 'pipe:0', '-c:v', 'copy', '-c:a', 'aac', '-f', 'flv', outputUrl], { stdio: ['pipe', 'ignore', 'pipe'] });
  } catch (error) {
    state.status = 'error';
    return makeError('ffmpeg_spawn_failed', 'Could not start ffmpeg process.', String(error?.message || error));
  }

  state.process = child;
  state.startedAt = Date.now();
  state.stoppedAt = null;
  state.durationMs = 0;
  state.lastExitCode = null;

  child.stderr.on('data', (chunk) => {
    const msg = String(chunk).replaceAll(outputUrl, redacted).trim();
    if (msg) addLog(`ffmpeg: ${msg}`);
  });

  child.on('spawn', () => {
    state.status = 'live';
    addLog('transmitter is live');
  });

  child.on('error', (error) => {
    state.status = 'error';
    addLog('ffmpeg process error');
    state.process = null;
    state.durationMs = state.startedAt ? Date.now() - state.startedAt : 0;
    state.stoppedAt = Date.now();
    makeError('ffmpeg_spawn_failed', 'ffmpeg process failed to start.', String(error?.message || error));
  });

  child.on('exit', (code) => {
    state.lastExitCode = typeof code === 'number' ? code : null;
    state.stoppedAt = Date.now();
    state.durationMs = state.startedAt ? state.stoppedAt - state.startedAt : 0;
    state.process = null;
    if (code === 0 || code === null) {
      if (state.status !== 'error') state.status = 'stopped';
      addLog(`transmitter stopped (code=${code ?? 'unknown'})`);
      return;
    }
    state.status = 'error';
    addLog(`transmitter exited with non-zero code=${code}`);
    makeError('ffmpeg_exit_nonzero', 'Streaming stopped because ffmpeg exited unexpectedly.', `exit code ${code}`);
  });

  return { ok: true, status: 'starting', target: redacted };
}

export function pushMediaChunk(buffer) {
  if (!state.process || state.status !== 'live' || !state.process.stdin.writable) {
    return makeError('not_running', 'Transmitter is not live. Start stream first.');
  }
  try {
    state.process.stdin.write(buffer);
    return { ok: true };
  } catch (error) {
    state.status = 'error';
    addLog('stdin write failed');
    return makeError('stdin_write_failed', 'Failed to send media chunk to ffmpeg.', String(error?.message || error));
  }
}

export function stopTransmitter() {
  if (!state.process) {
    state.status = 'stopped';
    return makeError('not_running', 'Transmitter is already stopped.');
  }
  state.status = 'stopping';
  state.process.stdin.end();
  state.process.kill('SIGINT');
  addLog('stopping transmitter');
  return { ok: true, status: 'stopping' };
}
