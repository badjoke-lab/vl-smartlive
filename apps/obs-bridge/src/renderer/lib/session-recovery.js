// Inspect/recover interrupted OBS Bridge journals after explicit local folder authorization.
// No remote calls; neither scanning nor resuming ever silently truncates a JSONL file.
import { resumeVerifiedContinuousSession } from './continuous-session-logger.js';

const ID_PATTERN = /^sl_session_[a-z0-9_-]{1,96}$/i;
const FILES = Object.freeze([
  'session.json', 'comments.jsonl', 'alerts.jsonl',
  'stream-state.jsonl', 'report.json', 'report.md'
]);
const EVENT_FILES = Object.freeze([
  ['comments.jsonl', 'comments'],
  ['alerts.jsonl', 'alerts'],
  ['stream-state.jsonl', 'streamStates']
]);
const MAX_FILE_BYTES = 20_000_000;

function validateId(sessionId) {
  if (!ID_PATTERN.test(String(sessionId ?? ''))) throw new Error('invalid_session_id');
}
async function getSessionsDirectory(root) {
  if (!root || typeof root.getDirectoryHandle !== 'function') {
    throw new Error('directory_handle_unavailable');
  }
  const logs = await root.getDirectoryHandle('logs', { create: false });
  return logs.getDirectoryHandle('sessions', { create: false });
}
async function openExistingSession(root, sessionId) {
  validateId(sessionId);
  const sessions = await getSessionsDirectory(root);
  const folder = await sessions.getDirectoryHandle(sessionId, { create: false });
  const handles = {};
  for (const name of FILES) {
    handles[name] = await folder.getFileHandle(name, { create: false });
  }
  const sessionFile = await handles['session.json'].getFile();
  if (sessionFile.size > MAX_FILE_BYTES) throw new Error('oversized_session_file');
  let session;
  try { session = JSON.parse(await sessionFile.text()); }
  catch { throw new Error('invalid_session_json'); }
  if (!session || typeof session !== 'object' || Array.isArray(session) ||
      session.sessionId !== sessionId ||
      !Number.isFinite(Date.parse(session.startedAt))) {
    throw new Error('invalid_session_metadata');
  }
  if (session.status !== 'active') {
    if (session.status === 'ended' || session.status === 'interrupted') {
      return { sessionId, session, status: 'closed', handles, counts: null };
    }
    throw new Error('unsupported_session_status');
  }
  const counts = { comments: 0, alerts: 0, streamStates: 0, held: 0 };
  for (const [filename, counter] of EVENT_FILES) {
    const file = await handles[filename].getFile();
    if (file.size > MAX_FILE_BYTES) throw new Error('oversized_event_file');
    const data = await file.text();
    if (data && !data.endsWith('\n')) throw new Error('unterminated_jsonl:' + filename);
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i]) continue;
      let entry;
      try { entry = JSON.parse(lines[i]); }
      catch { throw new Error('invalid_jsonl:' + filename); }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
          entry.sessionId !== sessionId) {
        throw new Error('mixed_or_invalid_session:' + filename);
      }
      counts[counter] += 1;
      if (filename === 'comments.jsonl' && entry.held === true) counts.held += 1;
    }
  }
  return { sessionId, session, status: 'recoverable', handles, counts };
}

// User-facing summaries contain only stable codes and counters, never captured comment text.
export async function inspectInterruptedSession(root, sessionId) {
  validateId(sessionId);
  try {
    const candidate = await openExistingSession(root, sessionId);
    return {
      sessionId,
      status: candidate.status,
      counts: candidate.counts,
      startedAt: candidate.session.startedAt,
      mode: candidate.session.mode === 'native-readonly' ? 'native-readonly' : 'mock',
      reason: candidate.status === 'closed' ? 'already_finalized' : null
    };
  } catch (error) {
    const reason = String(error?.message || '');
    const safe = /^(invalid_session_json|invalid_session_metadata|oversized_session_file|oversized_event_file|unsupported_session_status|unterminated_jsonl:.*|invalid_jsonl:.*|mixed_or_invalid_session:.*)$/.test(reason)
      ? reason : 'missing_files_or_unreadable_session';
    return { sessionId, status: 'invalid', counts: null, reason: safe };
  }
}

export async function listInterruptedSessions(root) {
  let sessions;
  try { sessions = await getSessionsDirectory(root); }
  catch (error) {
    if (error?.name === 'NotFoundError') return [];
    throw error;
  }
  if (typeof sessions.entries !== 'function') throw new Error('directory_listing_unavailable');
  const ids = [];
  for await (const [name, handle] of sessions.entries()) {
    if (handle.kind === 'directory' && ID_PATTERN.test(name)) ids.push(name);
    if (ids.length > 1000) throw new Error('too_many_session_directories');
  }
  ids.sort();
  const result = [];
  for (const id of ids) result.push(await inspectInterruptedSession(root, id));
  return result;
}

async function writeAndCheck(handle, content) {
  let writer;
  try {
    writer = await handle.createWritable();
    await writer.write(content);
    await writer.close();
    writer = null;
    if (await (await handle.getFile()).text() !== content) throw new Error('recovery_readback_mismatch');
  } catch (error) {
    try { await writer?.abort(); } catch {}
    throw error;
  }
}

export async function finalizeInterruptedSession(root, sessionId) {
  const found = await openExistingSession(root, sessionId);
  if (found.status !== 'recoverable') throw new Error('session_not_recoverable');
  const { session, counts, handles } = found;
  const recoveredAt = new Date().toISOString();
  // No invented endedAt: the real moment of unexpected termination is unknown.
  const report = {
    schemaVersion: session.schemaVersion,
    appId: session.appId,
    sessionId,
    generatedAt: recoveredAt,
    source: session.mode === 'native-readonly' ? 'native-readonly' : 'mock',
    status: 'interrupted',
    recordingEndUnconfirmed: true,
    counters: counts,
    deviceVerification: 'NOT TESTED'
  };
  const markdown = [
    '# OBS Bridge interrupted session', '',
    '- sessionId: ' + sessionId,
    '- status: interrupted (manually recovered)',
    '- last actual recording time: unknown',
    '- recoveredAt: ' + recoveredAt,
    '- comments recorded: ' + counts.comments,
    '- alerts recorded: ' + counts.alerts,
    '- OBS states recorded: ' + counts.streamStates,
    '- held comments: ' + counts.held,
    '- device verification: NOT TESTED', '',
    'Numbers are derived from readable, complete JSONL records on disk.',
    'Unrecorded activity and the termination time cannot be reconstructed.',
    ''
  ].join('\n');
  // Write session metadata LAST so a partial recovery can be safely retried.
  await writeAndCheck(handles['report.md'], markdown);
  await writeAndCheck(handles['report.json'], JSON.stringify(report, null, 2) + '\n');
  await writeAndCheck(handles['session.json'], JSON.stringify({
    ...session, status: 'interrupted', recoveredAt, recordingEndUnconfirmed: true,
    counters: counts
  }, null, 2) + '\n');
  return { sessionId, status: 'interrupted', counts, recoveredAt };
}

export async function resumeInterruptedSession(root, sessionId) {
  const found = await openExistingSession(root, sessionId);
  if (found.status !== 'recoverable') throw new Error('session_not_recoverable');
  const session = {
    ...found.session,
    recoveryCount: Math.max(0, Number(found.session.recoveryCount) || 0) + 1,
    resumedAt: new Date().toISOString(),
    recoveryGapUnmeasured: true
  };
  const recorder = resumeVerifiedContinuousSession({
    handles: found.handles, session, counts: found.counts
  });
  // Append an explicit recovery marker before accepting further events.
  await recorder.record('stream-state.jsonl', {
    eventType: 'manually_resumed_after_interruption',
    sourceType: 'recovery',
    connectionState: 'not_verified',
    observedAt: session.resumedAt
  });
  return {
    sessionId, session, recorder,
    counts: recorder.counts, resumedAt: session.resumedAt
  };
}
