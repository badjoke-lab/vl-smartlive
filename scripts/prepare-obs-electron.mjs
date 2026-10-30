import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve('dist/direct-release/obs-bridge');
if (!existsSync(resolve(appRoot, 'apps/obs-bridge/index.html'))) {
  throw new Error('Build the direct OBS Bridge edition first: pnpm run release:direct');
}
if (!existsSync(resolve(appRoot, 'apps/obs-bridge/src/renderer/lib/obs-readonly-websocket.js'))) {
  throw new Error('OBS read-only client missing from edition');
}
copyFileSync('scripts/obs-electron-main.cjs', resolve(appRoot, 'electron-main.cjs'));
writeFileSync(resolve(appRoot, 'package.json'), JSON.stringify({
  name: 'vl-smartlive-obs-bridge',
  productName: 'SmartLive OBS Bridge',
  version: '0.1.0',
  private: true,
  main: 'electron-main.cjs',
  description: 'Windows local-first OBS WebSocket v5 read-only companion'
}, null, 2) + '\n');
writeFileSync(resolve(appRoot, 'README_WINDOWS.txt'), `SmartLive OBS Bridge — Windows portable preview

Unzip all files and start "SmartLive OBS Bridge.exe".
OBS Studio and its WebSocket v5 server must be running on the same PC.
In OBS, enable Tools > WebSocket Server Settings, port 4455, and choose a password.
In SmartLive, choose Real OBS readonly, enter 127.0.0.1 / 4455 / password, then Connect.

The password is runtime-only. OBS streaming controls are intentionally unavailable.
This is a development preview, not a signed installer or a v1.0 release.
Actual Windows OBS connection has not been certified.
Comments are still mock/manual until live provider integration.

Issue tracker: https://github.com/badjoke-lab/vl-smartlive/issues/46
`);
console.log('Prepared OBS Bridge Electron staging in dist/direct-release/obs-bridge');
