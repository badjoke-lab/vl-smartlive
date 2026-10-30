# SmartLive OBS Bridge

OBS Bridge is a read-only monitoring companion for an already-running OBS session. It does not control stream start/stop, scenes, or recording.

## Local OBS WebSocket v5 connection

The current local-browser build can authenticate to an OBS WebSocket v5 server running **on the same computer**. This is an integration step toward the eventual Windows Electron edition, **not** the finished Windows application.

1. Install OBS Studio with OBS WebSocket v5 support; open **Tools → WebSocket Server Settings** in OBS.
2. Enable the WebSocket server. Use loopback host `127.0.0.1` (or `localhost`) and note the configured port (default `4455`). Set a password in OBS.
3. From the repository root, run `pnpm run release:direct`, then `cd dist/direct-release/obs-bridge && node server.mjs`.
4. Open **http://127.0.0.1:4176/** in a modern browser. Choose **Real OBS readonly** in the Readonly Connection section (or **Native read-only OBS** in the settings mode selector).
5. Enter the local host, port and OBS WebSocket password. Select **Connect**. The password field is cleared after the attempt; it is not stored in local settings.
6. If OBS accepts the authentication, observe **connected — OBS WebSocket v5**, scene, streaming/recording state, CPU usage, FPS and skipped frames. Data refreshes approximately every 3 seconds. Bitrate remains unavailable until a real sampling mechanism exists.
7. Stop OBS or disable the server to check that the status changes to disconnected and metrics become unavailable. **Disconnect** closes the monitoring connection. **Retry** creates a fresh connection.

**No stream output or live comments are produced by this connection.** Comments remain sample/manually imported until the separate live-comment provider integration is finished. Mock OBS is explicitly labelled DEMO.

## Connection trouble

- **NOT CONNECTED / auth_failed:** verify OBS WebSocket password and server settings.
- **connection_failed / connection_closed:** ensure OBS is running and its WebSocket server is listening on the correct local port.
- **invalid_local_target:** only `127.0.0.1`, `localhost` and IPv6 loopback are allowed, with a valid port.
- **websocket_unavailable / crypto_unavailable:** use a modern browser at the local HTTP URL (not an arbitrary remote HTTP site).
- **request_failed / request_timeout:** reconnect; do not treat the stale status or values as current.

Keep the OBS WebSocket password, stream key, OAuth tokens and full private stream URLs out of bug reports and screenshots.

## Verification scope

`pnpm run obs-readonly:check` runs an emulated OBS WebSocket v5 protocol test for authentication, read-only requests, disconnect, denial and timeout. It **does not** use a real OBS process or prove the Windows desktop edition works.

## Current limitations

- Browser/local Node preview still requires Node.js 20+ and is **not** a signed desktop executable.
- Live chat providers, automated persistent session logs and desktop packaging are separate roadmap gates.
- The local connection is read-only. No OBS streaming control request can be sent by this client.
- The settings UI and report previews are under active development; treat DEMO content as synthetic.

See [ROADMAP](../../docs/ROADMAP.md) and [known issues](../../docs/known-issues.md).
