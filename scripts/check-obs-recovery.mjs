import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startContinuousSessionLogging } from '../apps/obs-bridge/src/renderer/lib/continuous-session-logger.js';
import {
  inspectInterruptedSession, listInterruptedSessions,
  resumeInterruptedSession, finalizeInterruptedSession
} from '../apps/obs-bridge/src/renderer/lib/session-recovery.js';

class FakeFile {
  constructor() { this.kind = 'file'; this.data = Buffer.alloc(0); this.fail = false; }
  async getFile() {
    const snapshot = Buffer.from(this.data);
    return { size: snapshot.byteLength, text: async () => snapshot.toString('utf8') };
  }
  async createWritable(options = {}) {
    const self = this;
    let data = options.keepExistingData ? Buffer.from(this.data) : Buffer.alloc(0);
    let offset = 0;
    return {
      async seek(next) { offset = next; },
      async write(input) {
        if (self.fail) throw new Error('disk_full');
        const bytes = Buffer.from(String(input), 'utf8');
        data = Buffer.concat([data.subarray(0, offset), bytes, data.subarray(offset + bytes.length)]);
        offset += bytes.length;
      },
      async close() { self.data = data; },
      async abort() {}
    };
  }
}
class FakeDirectory {
  constructor() { this.kind = 'directory'; this.files = new Map(); this.children = new Map(); }
  async getDirectoryHandle(name, opts = {}) {
    if (!this.children.has(name)) {
      if (!opts.create) throw Object.assign(new Error('missing directory'), {name:'NotFoundError'});
      this.children.set(name, new FakeDirectory());
    }
    return this.children.get(name);
  }
  async getFileHandle(name, opts = {}) {
    if (!this.files.has(name)) {
      if (!opts.create) throw Object.assign(new Error('missing file'), {name:'NotFoundError'});
      this.files.set(name, new FakeFile());
    }
    return this.files.get(name);
  }
  async *entries() { yield* this.children; yield* this.files; }
}
const root = new FakeDirectory();
const startedAt = '2026-11-23T02:20:00.000Z';
const id = 'sl_session_20261123_022000_reco1';
const create = async (sessionId) => startContinuousSessionLogging(root, {
  sessionId, startedAt, mode:'native-readonly', password:'DO_NOT_PERSIST'
});
const folderFor = (sessionId) => root.children.get('logs').children.get('sessions').children.get(sessionId);
const textOf = async (folder,name) => (await folder.files.get(name).getFile()).text();

let writer = await create(id);
await writer.record('stream-state.jsonl', { sceneName: 'Entry',sourceType:'obs_websocket_v5' });
await writer.record('comments.jsonl', { text: 'hello', held: true, sourceType: 'manual' });
await writer.record('alerts.jsonl', { category: 'held_comment' });
const folder = folderFor(id);
const originalJournal = {};
for (const name of ['comments.jsonl','alerts.jsonl','stream-state.jsonl']) {
  originalJournal[name] = await textOf(folder,name);
}
const unfinished = await inspectInterruptedSession(root,id);
assert.equal(unfinished.status,'recoverable');
assert.deepEqual(unfinished.counts,{comments:1,alerts:1,streamStates:1,held:1});
assert.equal(unfinished.mode,'native-readonly');
assert.deepEqual((await listInterruptedSessions(root)).map(x=>x.sessionId),[id]);
assert.doesNotMatch(JSON.stringify(unfinished), /hello|DO_NOT_PERSIST/);

// A resumed writer appends a clear gap marker, preserves prior bytes, and finishes normally.
writer = null; // simulates dropping the in-memory writer after browser termination
const continued = await resumeInterruptedSession(root,id);
assert.equal(continued.sessionId,id);
assert.equal(continued.counts.streamStates,2); // includes recovery marker
for (const name of ['comments.jsonl','alerts.jsonl']) {
  assert.equal(await textOf(folder,name),originalJournal[name]);
}
assert.ok((await textOf(folder,'stream-state.jsonl')).startsWith(originalJournal['stream-state.jsonl']));
await continued.recorder.record('comments.jsonl',{text:'resumed',held:false,sourceType:'manual'});
const done = await continued.recorder.finish('2026-11-23T02:30:00.000Z');
assert.deepEqual(done.counts,{comments:2,alerts:1,streamStates:2,held:1});
const endedSession = JSON.parse(await textOf(folder,'session.json'));
const endedReport = JSON.parse(await textOf(folder,'report.json'));
assert.equal(endedSession.status,'ended');
assert.equal(endedSession.recoveryGapUnmeasured,true);
assert.equal(endedSession.recoveryCount,1);
assert.deepEqual(endedReport.counters,done.counts);
assert.equal((await inspectInterruptedSession(root,id)).status,'closed');
await assert.rejects(()=>resumeInterruptedSession(root,id),/session_not_recoverable/);
await assert.rejects(()=>finalizeInterruptedSession(root,id),/session_not_recoverable/);

// Finalizing an interruption does not invent the actual stream-end time.
const interruptedId='sl_session_20261123_022100_reco2';
const interruptedWriter=await create(interruptedId);
await interruptedWriter.record('comments.jsonl',{text:'before interruption',held:false});
await interruptedWriter.record('stream-state.jsonl',{connectionState:'disconnected'});
const interruptedFolder=folderFor(interruptedId);
const beforeJsonl=await textOf(interruptedFolder,'comments.jsonl');
const final=await finalizeInterruptedSession(root,interruptedId);
assert.equal(final.status,'interrupted');
assert.deepEqual(final.counts,{comments:1,alerts:0,streamStates:1,held:0});
const interruptedSession=JSON.parse(await textOf(interruptedFolder,'session.json'));
const interruptedReport=JSON.parse(await textOf(interruptedFolder,'report.json'));
assert.equal(interruptedSession.status,'interrupted');
assert.equal(interruptedSession.endedAt,undefined);
assert.equal(interruptedSession.recordingEndUnconfirmed,true);
assert.equal(interruptedReport.recordingEndUnconfirmed,true);
assert.deepEqual(interruptedReport.counters,interruptedSession.counters);
assert.equal(await textOf(interruptedFolder,'comments.jsonl'),beforeJsonl);
await assert.rejects(()=>finalizeInterruptedSession(root,interruptedId),/session_not_recoverable/);

// Truncated/foreign JSONL is NEVER modified or silently counted.
const damagedId='sl_session_20261123_022200_reco3';
await create(damagedId);
const damagedFolder=folderFor(damagedId);
damagedFolder.files.get('comments.jsonl').data=Buffer.from('{"sessionId":"'+damagedId+'"}');
const damagedBefore=await textOf(damagedFolder,'comments.jsonl');
assert.match((await inspectInterruptedSession(root,damagedId)).reason,/unterminated_jsonl/);
await assert.rejects(()=>finalizeInterruptedSession(root,damagedId),/unterminated_jsonl/);
assert.equal(await textOf(damagedFolder,'comments.jsonl'),damagedBefore);
damagedFolder.files.get('comments.jsonl').data=Buffer.from('{"sessionId":"sl_session_other"}\n');
assert.match((await inspectInterruptedSession(root,damagedId)).reason,/mixed_or_invalid_session/);
await assert.rejects(()=>resumeInterruptedSession(root,damagedId),/mixed_or_invalid_session/);

// Failed report write cannot mark an incomplete session as recovered.
const failedId='sl_session_20261123_022300_reco4';
await create(failedId);
const failedFolder=folderFor(failedId);
failedFolder.files.get('report.json').fail=true;
await assert.rejects(()=>finalizeInterruptedSession(root,failedId),/disk_full/);
assert.equal(JSON.parse(await textOf(failedFolder,'session.json')).status,'active');
failedFolder.files.get('report.json').fail=false;
assert.equal((await finalizeInterruptedSession(root,failedId)).status,'interrupted');

// Missing/incomplete files are visible but not repairable without manual investigation.
const missingId='sl_session_20261123_022400_reco5';
const missingFolder=await root.children.get('logs').children.get('sessions').getDirectoryHandle(missingId,{create:true});
await missingFolder.getFileHandle('session.json',{create:true});
assert.equal((await inspectInterruptedSession(root,missingId)).status,'invalid');

const ui=readFileSync('apps/obs-bridge/src/renderer/main.js','utf8');
const html=readFileSync('apps/obs-bridge/index.html','utf8');
for (const term of [
  'inspectInterruptedSessionsButton','resumeInterruptedSessionButton',
  'finalizeInterruptedSessionButton','recoverySessionSelect'
]) assert.match(html,new RegExp(term));
for (const term of [
  'listInterruptedSessions','resumeInterruptedSession','finalizeInterruptedSession',
  'startSessionMock(recoveredSession'
]) assert.ok(ui.includes(term),'Missing UI wiring '+term);

console.log('OBS recovery: inspection, resume, gap marker, report rebuilding, finalized protection, corrupt-data refusal and retry passed.');
