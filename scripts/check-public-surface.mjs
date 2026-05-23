import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const t = (...x) => x.join('');
const blocked = [
  new RegExp(t('PR-','[0-9]+'), 'i'),
  new RegExp(t('clean',' repo','sitory'), 'i'),
  new RegExp(t('clean',' repo','sitory',' snap','shot'), 'i'),
  new RegExp(t('history',' au','dit'), 'i'),
  new RegExp(t('history','-st','ate'), 'i'),
  new RegExp(t('migra','tion'), 'i'),
  new RegExp(t('cost','-light'), 'i'),
  new RegExp(t('\\b','bud','get','\\b'), 'i'),
  new RegExp(t('no ','paid ','API'), 'i'),
  new RegExp(t('paid ','API'), 'i'),
  new RegExp(t('Niche','Works'), 'i'),
  new RegExp(t('niche','works'), 'i'),
  new RegExp(t('vl-','smart','live','-hist','ory'), 'i'),
  new RegExp(t('task',' mile','stone'), 'i'),
  new RegExp(t('later ','PR'), 'i'),
  new RegExp(t('Place','holder',' for'), 'i'),
  new RegExp(t('place','holder',' package'), 'i'),
  new RegExp(t('shell ','place','holder'), 'i'),
  new RegExp(t('reference ','snap','shot'), 'i'),
  new RegExp(t('release','-notes'), 'i'),
  new RegExp('\\u30cb\\u30c3\\u30c1\\u30ef\\u30fc\\u30af\\u30b9', 'i')
];
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
const skipFiles = new Set(['pnpm-lock.yaml']);
const hits = [];
function walk(dir){for(const name of readdirSync(dir)){if(skipDirs.has(name)) continue;const full=join(dir,name);const st=statSync(full);if(st.isDirectory()){walk(full);continue;}if(skipFiles.has(name)) continue;let text;try{text=readFileSync(full,'utf8');}catch{continue;}for(const p of blocked){if(p.test(text)) hits.push(`${full}: ${p}`);}}}
walk('.');
if(hits.length){console.error('Public surface check failed.');for(const h of hits) console.error(h);process.exit(1);}console.log('Public surface check passed.');
