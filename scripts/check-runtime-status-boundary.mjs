import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const obs = read('apps/obs-bridge/src/renderer/main.js');
const obsHtml = read('apps/obs-bridge/index.html');
const pc = read('apps/pc-standalone/src/main.js');
const mobile = read('apps/mobile/index.html');
const mobileJs = read('apps/mobile/src/main.js');
const web = read('apps/console/src/main.js');

assert.match(obs, /createObsReadonlyClient/);
assert.match(obs, /await obsClient\.connect/);
assert.match(obs, /await obsClient\.refresh/);
assert.match(obs, /OBS WebSocket v5 authenticated/);
assert.doesNotMatch(obs, /real_obs_client_not_wired/);
assert.doesNotMatch(obs, /setObsState\(\{ connection: "connected", streamState: "unknown", currentSceneName: "Read-only preview" \}\)/);
assert.doesNotMatch(obs, /successful connection readonly mode/);
assert.match(obsHtml, /local WebSocket v5/);

assert.match(pc, /DEMO \/ NO RTMP OUTPUT/);
assert.match(pc, /No encoder connection, live broadcast, measured bitrate or viewer count/);
assert.doesNotMatch(pc, /\['Connected', previewLabel\(\)/);
assert.match(mobile, /DEMO — ライブ未接続/);
assert.match(mobileJs, /No RTMP streaming or real live chat is connected/);
assert.match(web, /PARTIAL USER FILE: other sections contain DEMO sample values/);
assert.match(web, /DEMO: OBS Bridge sample/);

console.log('Runtime truth-in-status static guard passed (does not replace device or browser UI tests).');
