export const OBS_FLOW_STATES = Object.freeze({
  IDLE: 'idle',
  MOCK_READY: 'mock_ready',
  NATIVE_READONLY_SELECTED: 'native_readonly_selected',
  CONNECTING: 'connecting',
  CONNECTED_READONLY: 'connected_readonly',
  UNSUPPORTED_RUNTIME: 'unsupported_runtime',
  CONNECTION_FAILED: 'connection_failed',
  REQUEST_FAILED: 'request_failed',
  DISCONNECTED: 'disconnected',
});

export function getRuntimeSupportLabel(runtimeSupport) {
  if (!runtimeSupport.webSocketAvailable) return 'websocket_unavailable';
  if (!runtimeSupport.nativeReadonlyAvailable) return 'native_readonly_unavailable';
  return 'native_readonly_preview_only';
}
