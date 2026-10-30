import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createObsReadonlyClient, validateLocalObsTarget, READ_ONLY_REQUESTS, makeObsAuthentication } from '../apps/obs-bridge/src/renderer/lib/obs-readonly-websocket.js';

const sendAsync = (socket, packet) => queueMicrotask(() => {
  if (socket.readyState === 1) socket.onmessage?.({ data: JSON.stringify(packet) });
});
const serverRequests = [];
let mode = 'authenticated';
let lastIdentify = null;
let lastSocket = null;

class FakeObsSocket {
  constructor(url) {
    assert.equal(url, 'ws://127.0.0.1:4455');
    this.readyState = 1;
    lastSocket = this;
    const hello = { obsWebSocketVersion: '5.5', rpcVersion: 1 };
    if (mode !== 'no-auth') hello.authentication = { salt: 'unit-salt', challenge: 'unit-challenge' };
    sendAsync(this, { op: 0, d: hello });
  }
  send(serialized) {
    const { op, d } = JSON.parse(serialized);
    if (op === 1) {
      lastIdentify = d;
      if (mode === 'deny') {
        queueMicrotask(() => { this.readyState = 3; this.onclose?.({ code: 4009 }); });
      } else {
        sendAsync(this, { op: 2, d: { negotiatedRpcVersion: 1 } });
      }
      return;
    }
    assert.equal(op, 6, 'Only OBS request operation is allowed');
    assert.ok(READ_ONLY_REQUESTS.includes(d.requestType), 'No OBS control operation');
    serverRequests.push(d.requestType);
    const reply = {
      GetVersion: { obsVersion: '31.0.0' },
      GetCurrentProgramScene: { currentProgramSceneName: 'Camera A' },
      GetStreamStatus: { outputActive: true, outputSkippedFrames: 4 },
      GetStats: { cpuUsage: 17.8, activeFps: 59.94 },
      GetRecordStatus: { outputActive: false }
    };
    const ok = mode !== 'reject-version' || d.requestType !== 'GetVersion';
    sendAsync(this, {
      op: 7,
      d: { requestId: d.requestId, requestType: d.requestType,
        requestStatus: { result: ok, code: ok ? 100 : 600 },
        responseData: ok ? reply[d.requestType] : {} }
    });
  }
  close() {
    this.readyState = 3;
    queueMicrotask(() => this.onclose?.({ code: 1000 }));
  }
}

const expectedSecret = createHash('sha256').update('test-password' + 'unit-salt').digest('base64');
const expectedAuth = createHash('sha256').update(expectedSecret + 'unit-challenge').digest('base64');
assert.equal(await makeObsAuthentication('test-password', 'unit-salt', 'unit-challenge', webcrypto), expectedAuth);
assert.equal(validateLocalObsTarget('::1', 4455), 'ws://[::1]:4455');
assert.throws(() => validateLocalObsTarget('evil.example', 4455), /invalid_local_target/);
assert.throws(() => validateLocalObsTarget('127.0.0.1/path', 4455), /invalid_local_target/);
assert.throws(() => validateLocalObsTarget('127.0.0.1', 70000), /invalid_local_target/);

const disconnected = [];
let client = createObsReadonlyClient({
  WebSocketImpl: FakeObsSocket,
  cryptoImpl: webcrypto,
  onDisconnected: (reason) => disconnected.push(reason),
  timeoutMs: 600
});
const snapshot = await client.connect({ host: '127.0.0.1', port: 4455, password: 'test-password' });
assert.equal(lastIdentify.authentication, expectedAuth);
assert.deepEqual({ scene: snapshot.currentSceneName, stream: snapshot.streamState, recording: snapshot.recordingActive },
  { scene: 'Camera A', stream: 'live', recording: false });
assert.equal(snapshot.metrics.cpuUsagePercent, 17.8);
assert.equal(snapshot.metrics.fps, 59.94);
assert.equal(snapshot.metrics.droppedFrames, 4);
assert.equal(snapshot.metrics.bitrateKbps, null);
assert.deepEqual(serverRequests.slice(0, 5), READ_ONLY_REQUESTS);
assert.equal(client.isConnected(), true);
assert.equal((await client.refresh()).currentSceneName, 'Camera A');
assert.throws(() => client.request('StartStream'), /forbidden_request/);
assert.equal(serverRequests.length, 10);
lastSocket.close();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(client.isConnected(), false);
assert.deepEqual(disconnected, ['connection_closed']);

mode = 'no-auth';
client = createObsReadonlyClient({ WebSocketImpl: FakeObsSocket, cryptoImpl: webcrypto, timeoutMs: 600 });
await client.connect({ host: '127.0.0.1', port: 4455, password: '' });
assert.equal(lastIdentify.authentication, undefined);
client.disconnect();

mode = 'authenticated';
client = createObsReadonlyClient({ WebSocketImpl: FakeObsSocket, cryptoImpl: webcrypto, timeoutMs: 600 });
await assert.rejects(client.connect({ host: '127.0.0.1', port: 4455 }), /auth_required/);
assert.equal(client.isConnected(), false);

mode = 'deny';
client = createObsReadonlyClient({ WebSocketImpl: FakeObsSocket, cryptoImpl: webcrypto, timeoutMs: 600 });
await assert.rejects(client.connect({ host: '127.0.0.1', port: 4455, password: 'bad' }), /auth_failed/);
assert.equal(client.isConnected(), false);

mode = 'reject-version';
client = createObsReadonlyClient({ WebSocketImpl: FakeObsSocket, cryptoImpl: webcrypto, timeoutMs: 600 });
await assert.rejects(client.connect({ host: '127.0.0.1', port: 4455, password: 'test-password' }), /request_failed/);
assert.equal(client.isConnected(), false);

// A pending handshake without Hello fails closed, rather than claiming a connection.
class SilentSocket {
  constructor() { this.readyState = 1; }
  close() { this.readyState = 3; }
}
client = createObsReadonlyClient({ WebSocketImpl: SilentSocket, cryptoImpl: webcrypto, timeoutMs: 25 });
await assert.rejects(client.connect({ host: '127.0.0.1', port: 4455, password: 'test-password' }), /handshake_timeout/);

console.log('OBS WebSocket v5 handshake/auth/read-only/refresh/disconnect/error tests passed.');
