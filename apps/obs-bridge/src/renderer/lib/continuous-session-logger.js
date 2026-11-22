// Incremental OBS Bridge session writer. Directory permission must originate in a user gesture.
// Each JSONL event is committed before another write starts; no network or credential storage.
const SESSION_ID_RE = /^sl_session_[a-z0-9_-]{1,96}$/i;
const JSONL_FILES = Object.freeze(['comments.jsonl', 'alerts.jsonl', 'stream-state.jsonl']);
const OUTPUT_FILES = Object.freeze(['session.json', ...JSONL_FILES, 'report.json', 'report.md']);
const MAX_RECORD_BYTES = 256_000;
const MAX_LOG_BYTES = 20_000_000;
const sensitiveKey = /password|token|secret|stream.?key|authorization|oauth|credential|cookie/i;

function cleanText(input) {
  return String(input)
    .replace(/rtmps?:\/\/[^\s"']+/gi, '[stream-url-redacted]')
    .replace(/(password|streamkey|token|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/(?:Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, 'Bearer [redacted]');
}

function jsonText(value) {
  return JSON.stringify(value, (key, item) => {
    if (sensitiveKey.test(key)) return '[redacted]';
    return typeof item === 'string' ? cleanText(item) : item;
  });
}

async function writeFileVerified(handle, content) {
  let writable;
  try {
    writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    writable = null;
    if (await (await handle.getFile()).text() !== content) throw new Error('readback_mismatch');
  } catch (error) {
    try { await writable?.abort(); } catch { /* best effort */ }
    throw error;
  }
}

async function appendFileVerified(handle, jsonlLine) {
  const file = await handle.getFile();
  const oldText = await file.text();
  const nextSize = file.size + new TextEncoder().encode(jsonlLine).byteLength;
  if (nextSize > MAX_LOG_BYTES) throw new Error('log_size_limit');
  let writable;
  try {
    // Keep existing bytes, seek to the end, and commit the new line on close.
    writable = await handle.createWritable({ keepExistingData: true });
    await writable.seek(file.size);
    await writable.write(jsonlLine);
    await writable.close();
    writable = null;
    if (await (await handle.getFile()).text() !== oldText + jsonlLine) {
      throw new Error('append_readback_mismatch');
    }
  } catch (error) {
    try { await writable?.abort(); } catch { /* best effort */ }
    throw error;
  }
}

export async function startContinuousSessionLogging(directoryHandle, sessionInput) {
  const sessionId = sessionInput?.sessionId;
  if (!SESSION_ID_RE.test(String(sessionId || ''))) throw new Error('invalid_session_id');
  if (!directoryHandle || typeof directoryHandle.getDirectoryHandle !== 'function') {
    throw new Error('directory_handle_unavailable');
  }

  // Copy only approved metadata. OBS password, stream key and connection URL are excluded.
  const session = {
    schemaVersion: 'smartlive.log.v0.1',
    appId: 'obs-bridge',
    appVersion: '0.1.0',
    sessionId,
    mode: sessionInput.mode === 'native-readonly' ? 'native-readonly' : 'mock',
    startedAt: String(sessionInput.startedAt || new Date().toISOString()),
    status: 'active',
    deviceVerification: 'NOT TESTED'
  };
  const logs = await directoryHandle.getDirectoryHandle('logs', { create: true });
  const sessions = await logs.getDirectoryHandle('sessions', { create: true });
  const folder = await sessions.getDirectoryHandle(sessionId, { create: true });
  // Reject previous partial sessions as well as successful ones: never silently truncate evidence.
  for (const name of OUTPUT_FILES) {
    try {
      await folder.getFileHandle(name, { create: false });
      throw new Error('existing_session_data');
    } catch (error) {
      if (error?.message === 'existing_session_data') throw error;
      if (error?.name !== 'NotFoundError') throw error;
    }
  }

  const handles = {};
  for (const name of OUTPUT_FILES) handles[name] = await folder.getFileHandle(name, { create: true });
  const counts = { comments: 0, alerts: 0, streamStates: 0, held: 0 };
  await writeFileVerified(handles['session.json'], jsonText(session) + '\n');
  for (const name of JSONL_FILES) await writeFileVerified(handles[name], '');
  await writeFileVerified(handles['report.json'], jsonText({ sessionId, status: 'in_progress' }) + '\n');
  await writeFileVerified(handles['report.md'], '# OBS Bridge session\n\nRecording in progress.\n');

  return makeContinuousSessionRecorder(handles, session, counts);
}

export function resumeVerifiedContinuousSession({ handles, session, counts }) {
  if (!SESSION_ID_RE.test(String(session?.sessionId || ''))) throw new Error('invalid_session_id');
  if (!handles || OUTPUT_FILES.some((name) => typeof handles[name]?.getFile !== 'function')) {
    throw new Error('incomplete_session_handles');
  }
  if (!counts || Object.keys({comments:0,alerts:0,streamStates:0,held:0})
    .some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0)) {
    throw new Error('invalid_recovered_counts');
  }
  return makeContinuousSessionRecorder(handles, session, { ...counts });
}

function makeContinuousSessionRecorder(handles, session, counts) {
  const sessionId = session.sessionId;
  let tail = Promise.resolve();
  let fatalError = null;
  let finishing = false;
  const path = 'logs/sessions/' + sessionId;

  function record(fileName, payload) {
    if (finishing) return Promise.reject(new Error('recorder_closed'));
    if (!JSONL_FILES.includes(fileName)) return Promise.reject(new Error('unsupported_log_file'));
    const entry = { ...payload, sessionId, recordedAt: new Date().toISOString() };
    const line = jsonText(entry) + '\n';
    if (new TextEncoder().encode(line).byteLength > MAX_RECORD_BYTES) {
      return Promise.reject(new Error('record_size_limit'));
    }
    const task = tail.then(async () => {
      if (fatalError) throw fatalError;
      await appendFileVerified(handles[fileName], line);
      if (fileName === 'comments.jsonl') {
        counts.comments += 1;
        if (entry.held === true) counts.held += 1;
      } else if (fileName === 'alerts.jsonl') counts.alerts += 1;
      else counts.streamStates += 1;
      return { fileName, counts: { ...counts } };
    });
    tail = task.catch((error) => { fatalError ||= error; });
    return task;
  }

  async function finish(endedAt = new Date().toISOString()) {
    if (finishing) throw new Error('recorder_closed');
    finishing = true;
    await tail;
    if (fatalError) throw fatalError;
    const durationSec = Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(session.startedAt)) / 1000));
    const finalSession = { ...session, endedAt, durationSec, status: 'ended', counters: { ...counts } };
    // A report is derived from committed event counts, never from sample UI totals.
    const report = {
      schemaVersion: session.schemaVersion,
      appId: session.appId,
      sessionId,
      generatedAt: new Date().toISOString(),
      source: session.mode,
      status: 'ended',
      counters: { ...counts },
      deviceVerification: 'NOT TESTED'
    };
    const markdown = [
      '# OBS Bridge session report', '',
      '- sessionId: ' + sessionId,
      '- mode: ' + session.mode,
      '- comments recorded: ' + counts.comments,
      '- alerts recorded: ' + counts.alerts,
      '- OBS states recorded: ' + counts.streamStates,
      '- held comments: ' + counts.held,
      '- device verification: NOT TESTED', '',
      'Comments may be manually entered/imported. This does not claim real chat API integration.',
      ''
    ].join('\n');
    await writeFileVerified(handles['report.json'], jsonText(report) + '\n');
    await writeFileVerified(handles['report.md'], markdown);
    await writeFileVerified(handles['session.json'], jsonText(finalSession) + '\n');
    return { status: 'ended', sessionId, path, counts: { ...counts }, filesWritten: OUTPUT_FILES.length };
  }
  return { record, finish, get counts() { return { ...counts }; }, path, sessionId };
}
