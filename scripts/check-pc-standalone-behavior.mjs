import { readFileSync } from 'node:fs';

const main = readFileSync('apps/pc-standalone/src/main.js', 'utf8');
const i18n = readFileSync('apps/pc-standalone/src/i18n.js', 'utf8');
const errors = [];
const must = (cond, msg) => { if (!cond) errors.push(msg); };

must(i18n.includes("const STORAGE_KEY = 'smartlive.language'"), 'i18n storage key missing');
must(i18n.includes('en: {') && i18n.includes('ja: {'), 'en/ja dictionaries missing');
must(i18n.includes("return 'en';"), 'en fallback missing');

must(main.indexOf('warning: 0') < main.indexOf('question: 1') && main.indexOf('question: 1') < main.indexOf('issue: 2') && main.indexOf('issue: 2') < main.indexOf('praise: 3'), 'radar priority order missing');

must(main.includes('assertNoSecretsInExport'), 'assertNoSecretsInExport missing');
must(main.includes('streamKey') && main.includes('password') && main.includes('secret') && main.includes('token'), 'secret safety keywords missing');

must(main.includes('SAFE_PERSIST_KEYS'), 'safe persist key allowlist missing');
must(!/SAFE_PERSIST_KEYS[^\n]*streamKey/i.test(main), 'streamKey unexpectedly allowed in persistence');
must(!/SAFE_PERSIST_KEYS[^\n]*password/i.test(main), 'password unexpectedly allowed in persistence');

for (const hook of ['pinned', 'done', 'hidden', 'muted', 'read', 'validationStatus', 'Reset to defaults', 'Export settings', 'switchToStabilityMode']) {
  must(main.includes(hook), `required hook missing: ${hook}`);
}

for (const cmd of ['Download report.json', 'Download logs.json', 'Download comments.jsonl']) {
  must(i18n.includes(cmd), `required export command missing: ${cmd}`);
}

if (errors.length) {
  console.error('PC Standalone behavior check failed:');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}
console.log('PC Standalone behavior check passed.');
