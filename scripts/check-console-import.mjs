import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helperSource = readFileSync('apps/console/src/file-import-state.js', 'utf8');
const { USER_FILE_NAMES, mergeUserFileImports, summarizeUserFileImports } =
  await import('data:text/javascript,' + encodeURIComponent(helperSource));

assert.equal(Object.keys(USER_FILE_NAMES).length, 6);
const session = '{"sessionId":"actual-session"}';
const comments = '{"text":"actual message","source":"obs-bridge"}\n';
const alerts = '';
const first = mergeUserFileImports({}, { session });
assert.deepEqual(Object.keys(first), ['session']);
assert.equal(summarizeUserFileImports(first).missing.length, 5);
const second = mergeUserFileImports(first, { comments, alerts });
assert.equal(second.session, session, 'loading comments must preserve the prior session');
assert.equal(second.comments, comments);
assert.equal(second.alerts, '', 'zero-event JSONL is still a loaded file');
assert.equal(Object.hasOwn(first, 'comments'), false, 'the prior import snapshot is immutable');
const third = mergeUserFileImports(second, { comments: 'replacement\n', reportMd: '# Real report' });
assert.equal(third.session, session);
assert.equal(third.alerts, '');
assert.equal(third.comments, 'replacement\n');
assert.deepEqual(summarizeUserFileImports(third).loaded,
  ['session.json', 'comments.jsonl', 'alerts.jsonl', 'report.md']);
assert.equal(summarizeUserFileImports(third).missing.length, 2);
const all = mergeUserFileImports(third, { streamState: '', reportJson: '{}' });
assert.equal(summarizeUserFileImports(all).missing.length, 0);
assert.throws(() => mergeUserFileImports(third, { unknown: 'x' }), /invalid_import_file/);
assert.throws(() => mergeUserFileImports(third, { session: null }), /invalid_import_file/);
assert.throws(() => mergeUserFileImports([], { session }), /invalid_import_state/);
assert.throws(() => mergeUserFileImports(third, Object.fromEntries([['__proto__', 'bad']])), /invalid_import_file/);

const ui = readFileSync('apps/console/src/main.js', 'utf8');
assert.match(ui, /mergeUserFileImports\(importedUserFiles, changed\)/);
assert.match(ui, /loadSet\(importedUserFiles\)/);
assert.doesNotMatch(ui, /loadSet\(\{\s*\.\.\.sample\('unknown'\)/);
assert.match(ui, /state\.sourcesByFile\s*=\s*\{\}/);
assert.match(ui, /setChecklist\('session\.json', 'Pending'\)/);
assert.match(ui, /setChecklist\('report\.json', 'Pending'\)/);
console.log('Web Console W03: sequential imports preserve real files without demo fallback.');
