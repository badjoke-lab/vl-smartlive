import assert from 'node:assert/strict';
import { createInitialState, orderComments, validateRtmpTarget, sanitizePersistedSettings, buildSafeReportExport, buildSafeSettingsExport, assertNoSecretsInExport, applyCommentAction, applyStabilityAction } from '../apps/pc-standalone/src/behavior.js';

const state = createInitialState('en');
assert.equal(validateRtmpTarget(''), 'Missing target');
assert.equal(validateRtmpTarget('rtmp://example/live'), 'OK');
assert.equal(validateRtmpTarget('rtmps://example/live'), 'OK');
assert.equal(validateRtmpTarget('https://example.com'), 'Invalid target');

const radar = orderComments([{ radar: 'praise' }, { radar: 'warning' }, { radar: 'issue' }, { radar: 'question' }], 'Radar');
assert.deepEqual(radar.map((x) => x.radar), ['warning', 'question', 'issue', 'praise']);

const clean = sanitizePersistedSettings({ streamKey: 'x', apiToken: 'y', password: 'z', selectedPlatform: 'YouTube' });
assert.equal(clean.selectedPlatform, 'YouTube');
assert.equal('streamKey' in clean, false);
assert.equal('apiToken' in clean, false);

state.prepare.rtmpUrl = 'rtmp://example/live';
const report = buildSafeReportExport(state);
assert.equal(report.streamKeySaved, false);
assertNoSecretsInExport(JSON.stringify(report));
assertNoSecretsInExport(JSON.stringify(buildSafeSettingsExport(state)));

applyCommentAction(state, 'c1', 'pin'); assert.equal(state.comments[0].pinned, true);
applyCommentAction(state, 'c1', 'done'); assert.equal(state.comments[0].done, true);
applyCommentAction(state, 'c1', 'read'); assert.equal(state.comments[0].read, true);
applyCommentAction(state, 'c1', 'hide'); assert.equal(state.comments[0].hidden, true);
applyCommentAction(state, 'c1', 'mute'); assert.equal(state.comments[0].muted, true);

applyStabilityAction(state, 'switch'); assert.equal(state.stability.stabilityMode, true);
applyStabilityAction(state, 'reassess'); assert.equal(state.stability.reassessCount, 1);

console.log('PC Standalone behavior check passed.');
