// Preserve a user-selected multi-file session without inserting sample data.
// This module does not read files or persist content outside the current page.
export const USER_FILE_NAMES = Object.freeze({
  session: 'session.json',
  comments: 'comments.jsonl',
  alerts: 'alerts.jsonl',
  streamState: 'stream-state.jsonl',
  reportMd: 'report.md',
  reportJson: 'report.json'
});

export function mergeUserFileImports(previous, changed) {
  if (!previous || typeof previous !== 'object' || Array.isArray(previous) ||
      !changed || typeof changed !== 'object' || Array.isArray(changed)) {
    throw new TypeError('invalid_import_state');
  }
  const updated = { ...previous };
  for (const [key, content] of Object.entries(changed)) {
    if (!Object.hasOwn(USER_FILE_NAMES, key) || typeof content !== 'string') {
      throw new TypeError('invalid_import_file');
    }
    updated[key] = content;
  }
  return updated;
}

export function summarizeUserFileImports(files) {
  const loaded = [];
  const missing = [];
  for (const [key, name] of Object.entries(USER_FILE_NAMES)) {
    (Object.hasOwn(files, key) ? loaded : missing).push(name);
  }
  return { loaded, missing };
}
