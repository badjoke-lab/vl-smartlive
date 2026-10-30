import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = readFileSync('apps/mobile-android/app/src/main/java/com/viewloom/mobile/MainActivity.kt', 'utf8');
const extract = (start, end) => {
  const a = code.indexOf(start);
  const b = code.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Missing Kotlin method boundary: ${start}`);
  return code.slice(a, b);
};

const failure = extract('override fun onConnectionFailedRtmp(', 'override fun onDisconnectRtmp(');
const redact = extract('private fun redactTarget(', 'private fun refreshCommentsPanel(');

// The RootEncoder reason may contain raw transport strings; never echo it to the UI or logs.
assert.doesNotMatch(failure, /\$reason|\$\{reason\}|reason\s*=\s*\$|\$safeTarget/);
assert.match(failure, /Check network and RTMP target settings/);
// A custom URL can carry credentials in the path, query, host or user-info.
assert.match(redact, /\[redacted\]/);
assert.doesNotMatch(redact, /return target(?:\s|$)|return target\.replace/);
console.log('Android stream target and failure output static guard passed (not a device test).');
