import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startContinuousSessionLogging } from '../apps/obs-bridge/src/renderer/lib/continuous-session-logger.js';

class MemoryFile {
  constructor() { this.data = Buffer.alloc(0); this.fail = false; }
  async getFile() {
    const snapshot = Buffer.from(this.data);
    return { size: snapshot.length, text: async () => snapshot.toString('utf8') };
  }
  async createWritable(opts = {}) {
    const file = this;
    let data = opts.keepExistingData ? Buffer.from(file.data) : Buffer.alloc(0);
    let pos = 0;
    return {
      async seek(position) { pos = position; },
      async write(text) {
        if (file.fail) throw new Error('disk_full');
        const bytes = Buffer.from(String(text), 'utf8');
        data = Buffer.concat([
          data.subarray(0, pos), bytes,
          pos + bytes.length < data.length ? data.subarray(pos + bytes.length) : Buffer.alloc(0)
        ]);
        pos += bytes.length;
      },
      async close() { file.data = data; },
      async abort() {}
    };
  }
}
class MemoryDirectory {
  constructor() { this.children = new Map(); this.files = new Map(); }
  async getDirectoryHandle(name, opts = {}) {
    if (!this.children.has(name)) {
      if (!opts.create) throw Object.assign(new Error('not found'), { name: 'NotFoundError' });
      this.children.set(name, new MemoryDirectory());
    }
    return this.children.get(name);
  }
  async getFileHandle(name, opts = {}) {
    if (!this.files.has(name)) {
      if (!opts.create) throw Object.assign(new Error('not found'), { name: 'NotFoundError' });
      this.files.set(name, new MemoryFile());
    }
    return this.files.get(name);
  }
}
const base = new MemoryDirectory();
const id = 'sl_session_20261123_022000_t001';
const startedAt = '2026-11-23T02:20:00.000Z';
const recorder = await startContinuousSessionLogging(base, {
  sessionId: id, startedAt, mode: 'native-readonly',
  password: 'must-not-appear', streamKey: 'must-not-appear'
});
const folder = base.children.get('logs').children.get('sessions').children.get(id);
assert.equal(folder.files.size, 6);
assert.match(await (await folder.files.get('session.json').getFile()).text(), /native-readonly/);
assert.doesNotMatch(await (await folder.files.get('session.json').getFile()).text(), /must-not-appear/);
const results = await Promise.all([
  recorder.record('stream-state.jsonl', { source: 'obs-websocket-v5', sceneName: 'Start' }),
  recorder.record('comments.jsonl', { text: 'こんにちは', held: true, token: 'secret-goes-here', sourceType: 'manual' }),
  recorder.record('comments.jsonl', { text: 'password=abc rtmps://server/app/private-key', held: false, sourceType: 'imported' }),
  recorder.record('stream-state.jsonl', { source: 'obs-websocket-v5', sceneName: 'Next scene' }),
  recorder.record('alerts.jsonl', { category: 'held_comment', severity: 'warning' })
]);
assert.equal(results.length, 5);
const comments = (await (await folder.files.get('comments.jsonl').getFile()).text()).trim().split('\n').map(JSON.parse);
assert.equal(comments.length, 2);
assert.equal(comments[0].text, 'こんにちは');
assert.equal(comments[0].token, '[redacted]');
assert.equal(comments[0].held, true);
assert.doesNotMatch(JSON.stringify(comments), /private-key|secret-goes-here|password=abc/);
const states = (await (await folder.files.get('stream-state.jsonl').getFile()).text()).trim().split('\n').map(JSON.parse);
assert.deepEqual(states.map(x => x.sceneName), ['Start', 'Next scene']);
assert.deepEqual(recorder.counts, { comments: 2, alerts: 1, streamStates: 2, held: 1 });
await assert.rejects(() => recorder.record('session.json', { fake: true }), /unsupported_log_file/);
const result = await recorder.finish('2026-11-23T02:21:00.000Z');
assert.equal(result.filesWritten, 6);
assert.deepEqual(result.counts, { comments: 2, alerts: 1, streamStates: 2, held: 1 });
const storedSession = JSON.parse(await (await folder.files.get('session.json').getFile()).text());
const report = JSON.parse(await (await folder.files.get('report.json').getFile()).text());
assert.equal(storedSession.status, 'ended');
assert.equal(storedSession.durationSec, 60);
assert.deepEqual(report.counters, storedSession.counters);
await assert.rejects(() => recorder.record('comments.jsonl', {}), /recorder_closed/);
await assert.rejects(() => startContinuousSessionLogging(base, { sessionId: id, startedAt }), /existing_session_data/);
await assert.rejects(() => startContinuousSessionLogging(base, { sessionId: '../escape', startedAt }), /invalid_session_id/);

const failedBase = new MemoryDirectory();
const failed = await startContinuousSessionLogging(failedBase, {
  sessionId: 'sl_session_20261123_022100_t002', startedAt, mode: 'mock'
});
const failedFolder = failedBase.children.get('logs').children.get('sessions').children.get(failed.sessionId);
failedFolder.files.get('comments.jsonl').fail = true;
await assert.rejects(() => failed.record('comments.jsonl', { text: 'write failed' }), /disk_full/);
await assert.rejects(() => failed.record('stream-state.jsonl', { sceneName: 'not committed' }), /disk_full/);
await assert.rejects(() => failed.finish(), /disk_full/);
assert.equal(await (await failedFolder.files.get('comments.jsonl').getFile()).text(), '');
assert.match(await (await failedFolder.files.get('report.json').getFile()).text(), /in_progress/);
assert.equal(failed.counts.comments, 0);

const ui = readFileSync('apps/obs-bridge/src/renderer/main.js', 'utf8');
const html = readFileSync('apps/obs-bridge/index.html', 'utf8');
assert.match(html, /beginIncrementalLogButton/);
assert.match(ui, /startContinuousSessionLogging/);
assert.match(ui, /localWriteBoundaryPlan: \{/);
assert.match(ui, /localPersistenceExecution: \{/);
assert.match(ui, /finalizedContinuousSessionId/);
assert.match(ui, /sourceType: 'imported_jsonl'/);
assert.match(ui, /category: 'held_comment'/);
assert.match(ui, /category: 'obs_connection'/);

console.log('OBS incremental logging: six files, ordered UTF-8 appends, redaction, committed counters, errors and collision protection passed.');
