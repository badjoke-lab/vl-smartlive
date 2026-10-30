// OBS WebSocket 5 client for the local-first browser preview / desktop shell.
// Restrict all requests to read-only methods, and never persist an OBS password.
export const READ_ONLY_REQUESTS = Object.freeze([
  'GetVersion', 'GetCurrentProgramScene', 'GetStreamStatus', 'GetStats', 'GetRecordStatus'
]);

const DEFAULT_TIMEOUT_MS = 6000;

function safeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function validateLocalObsTarget(host, port) {
  const normalized = String(host ?? '').trim().toLowerCase();
  const value = Number(port);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(normalized) ||
      !Number.isInteger(value) || value < 1 || value > 65535) {
    throw safeError('invalid_local_target');
  }
  return `ws://${normalized.includes(':') ? '[::1]' : normalized}:${value}`;
}

export async function makeObsAuthentication(password, salt, challenge, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle || !cryptoImpl?.getRandomValues) {
    throw safeError('crypto_unavailable');
  }
  const encode = (input) => new TextEncoder().encode(input);
  const b64 = (bytes) => {
    let binary = '';
    for (const value of bytes) binary += String.fromCharCode(value);
    return btoa(binary);
  };
  const secret = b64(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', encode(password + salt))));
  return b64(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', encode(secret + challenge))));
}

export function createObsReadonlyClient({
  WebSocketImpl = globalThis.WebSocket,
  cryptoImpl = globalThis.crypto,
  onDisconnected = () => {},
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  let socket = null;
  let identified = false;
  let generation = 0;
  let sequence = 0;
  const pending = new Map();
  let rejectHandshake = null;

  function rejectPending(code) {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(safeError(code));
    }
    pending.clear();
  }

  function disconnect() {
    generation++;
    const oldSocket = socket;
    socket = null;
    identified = false;
    const reject = rejectHandshake;
    rejectHandshake = null;
    if (reject) reject(safeError('disconnected'));
    rejectPending('disconnected');
    if (oldSocket && oldSocket.readyState !== 3) {
      try { oldSocket.close(); } catch { /* already closed */ }
    }
  }

  function request(type) {
    if (!READ_ONLY_REQUESTS.includes(type)) throw safeError('forbidden_request');
    if (!identified || !socket || socket.readyState !== 1) throw safeError('not_connected');
    const requestId = `sl-${++sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(safeError('request_timeout'));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer });
      try {
        socket.send(JSON.stringify({ op: 6, d: { requestType: type, requestId } }));
      } catch {
        clearTimeout(timer);
        pending.delete(requestId);
        reject(safeError('request_failed'));
      }
    });
  }

  async function refresh() {
    if (!identified) throw safeError('not_connected');
    const [version, scene, stream, stats, record] = await Promise.allSettled(
      READ_ONLY_REQUESTS.map((type) => request(type))
    );
    if (version.status === 'rejected') throw safeError('request_failed');
    const get = (result) => result.status === 'fulfilled' ? result.value : {};
    const output = get(stream);
    const metrics = get(stats);
    return {
      obsVersion: get(version).obsVersion ?? 'unknown',
      currentSceneName: get(scene).currentProgramSceneName ?? '--',
      streamState: output.outputActive === true ? 'live' : output.outputActive === false ? 'idle' : 'unknown',
      recordingActive: typeof get(record).outputActive === 'boolean' ? get(record).outputActive : null,
      metrics: {
        bitrateKbps: null, // OBS websocket does not give an instant bitrate in these responses.
        cpuUsagePercent: Number.isFinite(metrics.cpuUsage) ? metrics.cpuUsage : null,
        droppedFrames: Number.isFinite(output.outputSkippedFrames) ? output.outputSkippedFrames : null,
        fps: Number.isFinite(metrics.activeFps) ? metrics.activeFps : null
      }
    };
  }

  async function connect({ host, port, password = '' }) {
    disconnect();
    if (typeof WebSocketImpl !== 'function') throw safeError('websocket_unavailable');
    const address = validateLocalObsTarget(host, port);
    const myGeneration = generation;
    let ws;
    try { ws = new WebSocketImpl(address); } catch { throw safeError('connection_failed'); }
    socket = ws;

    const handshake = new Promise((resolve, reject) => {
      let complete = false;
      const deadline = setTimeout(() => fail('handshake_timeout'), timeoutMs);
      function finish() {
        if (complete) return false;
        complete = true;
        clearTimeout(deadline);
        rejectHandshake = null;
        return true;
      }
      function fail(code) {
        if (finish()) reject(safeError(code));
      }
      rejectHandshake = fail;
      ws.onmessage = async (event) => {
        if (myGeneration !== generation) return;
        let packet;
        try { packet = JSON.parse(event.data); } catch { fail('protocol_error'); return; }
        if (packet.op === 0 && !complete) {
          try {
            const hello = packet.d || {};
            if (!Number.isInteger(hello.rpcVersion) || hello.rpcVersion < 1) throw safeError('unsupported_rpc');
            const identify = { rpcVersion: 1 };
            if (hello.authentication) {
              if (!password) throw safeError('auth_required');
              identify.authentication = await makeObsAuthentication(
                password, hello.authentication.salt, hello.authentication.challenge, cryptoImpl
              );
            }
            if (myGeneration !== generation || complete) return;
            ws.send(JSON.stringify({ op: 1, d: identify }));
          } catch (error) {
            fail(error.code || 'auth_failed');
            try { ws.close(); } catch {}
          }
          return;
        }
        if (packet.op === 2 && !complete) {
          identified = true;
          if (finish()) resolve();
          return;
        }
        if (packet.op === 7) {
          const response = packet.d || {};
          const slot = pending.get(response.requestId);
          if (!slot) return;
          clearTimeout(slot.timer);
          pending.delete(response.requestId);
          if (response.requestStatus?.result === true) slot.resolve(response.responseData || {});
          else slot.reject(safeError('request_failed'));
        }
      };
      ws.onerror = () => {
        if (myGeneration !== generation) return;
        if (!complete) fail('connection_failed');
      };
      ws.onclose = (event) => {
        if (myGeneration !== generation) return;
        socket = null;
        identified = false;
        const code = event?.code === 4009 ? 'auth_failed' : 'connection_closed';
        if (!complete) fail(code);
        rejectPending('disconnected');
        onDisconnected(code);
      };
    });

    try {
      await handshake;
      return await refresh();
    } catch (error) {
      if (myGeneration === generation) disconnect();
      throw safeError(error?.code || 'connection_failed');
    }
  }

  return {
    connect,
    refresh,
    disconnect,
    isConnected: () => identified && socket?.readyState === 1,
    request
  };
}
