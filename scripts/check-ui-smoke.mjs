import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseRoot = join(root, 'dist', 'direct-release');
const errors = [];
const check = (c, m) => { if (!c) errors.push(m); };
const read = (p) => existsSync(p) ? readFileSync(p, 'utf8') : '';

check(existsSync(releaseRoot), 'dist/direct-release missing. Run pnpm run release:direct first.');

const pcFiles = ['apps/pc-standalone/index.html', 'apps/pc-standalone/src/main.js', 'apps/pc-standalone/src/i18n.js'];
let combined = '';
for (const f of pcFiles) combined += `\n${read(join(releaseRoot, 'pc-standalone', f))}`;

for (const term of ['SmartLive PC Standalone','Live','Prepare','Comments','Stability','Settings','Report','Open preview','End preview','Stream key is not saved','Validation status','Read queued','Pinned','Done','Muted','Stability mode ON','Settings saved locally','Download report.json','Download logs.json','Download comments.jsonl']) {
  check(combined.includes(term), `pc-standalone: missing ${term}`);
}
for (const term of ['Review all screens','Review: PC Standalone','Copy review summary','Export review snapshot','Back to app','01 Live','02 Prepare','03 Comments','04 Stability','05 Settings','06 Report']) {
  check(combined.includes(term), `pc-standalone review: missing ${term}`);
}

if (errors.length) { console.error('UI smoke check failed:'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }
console.log('UI smoke check passed.');
