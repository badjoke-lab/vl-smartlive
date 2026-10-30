import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SESSION_FILE_NAMES, validateSessionSnapshot, writeSessionSnapshot } from '../apps/obs-bridge/src/renderer/lib/session-file-writer.js';

class TestFile {
  constructor(name, failure = '') { this.name = name; this.failure = failure; this.content = ''; }
  async createWritable() {
    const file = this;
    let buffer = '';
    return {
      async write(value) {
        if (file.failure === 'write') throw new Error('disk_full');
        buffer = String(value);
      },
      async close() { file.content = buffer; },
      async abort() {}
    };
  }
  async getFile() {
    const value = this.failure === 'readback' ? 'corrupt' : this.content;
    return { text: async () => value };
  }
}
class TestDirectory {
  constructor(failures = {}) { this.children = new Map(); this.files = new Map(); this.failures = failures; }
  async getDirectoryHandle(name, opts = {}) {
    assert.equal(opts.create, true);
    if (!this.children.has(name)) this.children.set(name, new TestDirectory(this.failures));
    return this.children.get(name);
  }
  async getFileHandle(name, opts = {}) {
    assert.equal(opts.create, true);
    if (!this.files.has(name)) this.files.set(name, new TestFile(name, this.failures[name] || ''));
    return this.files.get(name);
  }
}
const id = 'sl_session_20261031_001122_abc123';
const data = {
  'session.json': JSON.stringify({ sessionId: id, status: 'ended' }),
  'comments.jsonl': JSON.stringify({ message: 'hello' }) + '\n',
  'alerts.jsonl': '', // zero alerts are valid
  'stream-state.jsonl': JSON.stringify({ streamActive: false }) + '\n',
  'report.json': JSON.stringify({ sessionId: id, comments: 1 }),
  'report.md': '# OBS Bridge report\n\n- comments: 1\n'
};
assert.equal(validateSessionSnapshot(id, data), true);
assert.throws(() => validateSessionSnapshot('../../escape', data), /invalid_session_id/);
assert.throws(() => validateSessionSnapshot(id, { ...data, 'session.json': '' }), /empty_payload/);
assert.throws(() => validateSessionSnapshot(id, { ...data, 'report.md': undefined }), /missing_payload/);
assert.throws(() => validateSessionSnapshot(id, { ...data, 'report.md': 'X'.repeat(10_000_001) }), /oversized_payload/);
assert.deepEqual(Object.keys(data).sort(), [...SESSION_FILE_NAMES].sort());

const dir = new TestDirectory();
const result = await writeSessionSnapshot(dir, id, data);
assert.equal(result.status, 'saved');
assert.equal(result.filesWritten, 6);
assert.deepEqual(result.failedFiles, []);
assert.equal(result.outputDirectory, `logs/sessions/${id}`);
const folder = dir.children.get('logs').children.get('sessions').children.get(id);
for (const [name, value] of Object.entries(data)) {
  assert.equal(await (await folder.files.get(name).getFile()).text(), value);
}
const repeated = await writeSessionSnapshot(dir, id, { ...data, 'report.md': 'updated report\n' });
assert.equal(repeated.status, 'saved');
assert.equal(folder.files.get('report.md').content, 'updated report\n');

const failing = new TestDirectory({ 'alerts.jsonl': 'write', 'report.json': 'readback' });
const partial = await writeSessionSnapshot(failing, id, data);
assert.equal(partial.status, 'partial_failure');
assert.equal(partial.filesWritten, 4);
assert.deepEqual(partial.failedFiles.map(f => f.name), ['alerts.jsonl', 'report.json']);
assert.ok(partial.failedFiles.every(f => !f.reason.includes('disk_full')));

const source = readFileSync('apps/obs-bridge/src/renderer/main.js', 'utf8');
assert.match(source, /await writeSessionSnapshot/);
assert.match(source, /await globalThis\.showDirectoryPicker/);
assert.doesNotMatch(source, /const filesWritten = Math\.max\(0/);
assert.match(source, /file\.endsWith\('\.jsonl'\)/);
console.log('OBS file save: six files verified, zero alerts, invalid paths, partial failures and readback checks passed.');
