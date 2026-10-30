// Browser File System Access API writer for the OBS Bridge session snapshot.
// A caller must obtain the directory handle via a user gesture. No implicit disk access.
export const SESSION_FILE_NAMES = Object.freeze([
  'session.json', 'comments.jsonl', 'alerts.jsonl', 'stream-state.jsonl', 'report.json', 'report.md'
]);

const SESSION_ID_PATTERN = /^sl_session_[a-z0-9_-]{1,96}$/i;

export function validateSessionSnapshot(sessionId, files) {
  if (!SESSION_ID_PATTERN.test(String(sessionId ?? ''))) throw new Error('invalid_session_id');
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('invalid_snapshot');
  for (const name of SESSION_FILE_NAMES) {
    if (typeof files[name] !== 'string') throw new Error(`missing_payload:${name}`);
    // Empty JSONL files are valid when a session has zero alerts or comments.
    if (!name.endsWith('.jsonl') && !files[name].trim()) throw new Error(`empty_payload:${name}`);
    if (files[name].length > 10_000_000) throw new Error(`oversized_payload:${name}`);
  }
  return true;
}

export async function writeSessionSnapshot(directoryHandle, sessionId, files) {
  validateSessionSnapshot(sessionId, files);
  if (!directoryHandle || typeof directoryHandle.getDirectoryHandle !== 'function') {
    throw new Error('directory_handle_unavailable');
  }

  const logs = await directoryHandle.getDirectoryHandle('logs', { create: true });
  const sessions = await logs.getDirectoryHandle('sessions', { create: true });
  const folder = await sessions.getDirectoryHandle(sessionId, { create: true });

  const filesWritten = [];
  const failures = [];
  for (const name of SESSION_FILE_NAMES) {
    let writable;
    try {
      const file = await folder.getFileHandle(name, { create: true });
      writable = await file.createWritable();
      await writable.write(files[name]);
      await writable.close();
      writable = null;
      // Verify bytes were durably readable, not merely planned or queued.
      const actual = await (await file.getFile()).text();
      if (actual !== files[name]) throw new Error('readback_mismatch');
      filesWritten.push(name);
    } catch (error) {
      try { await writable?.abort(); } catch { /* best effort */ }
      failures.push({ name, reason: error?.message === 'readback_mismatch' ? 'readback_mismatch' : 'write_or_read_failed' });
    }
  }
  return {
    status: failures.length ? 'partial_failure' : 'saved',
    outputDirectory: `logs/sessions/${sessionId}`,
    filesWritten: filesWritten.length,
    savedFiles: filesWritten,
    failedFiles: failures
  };
}
