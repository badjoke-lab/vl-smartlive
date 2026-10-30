# Known issues

This document lists public user-facing limitations for the current direct-distribution bundles.

## General

- Direct bundles require Node.js 20+.
- Direct bundles are not signed installers or app-store packages.
- Direct bundles run local browser interfaces from a local Node server.
- Some browser permission APIs depend on the user's browser, OS, and security settings.

## OBS Bridge

- OBS status handling is read-only in this bundle.
- Stream start/stop, scene switching, and recording controls are intentionally not included.
- Runtime credentials must be entered only at runtime and must not be saved, exported, or logged.
- Local OBS WebSocket v5 connection is available from the OBS Bridge browser shell (loopback only); actual OBS connectivity depends on OBS settings, permissions, and local network/browser rules.
- OBS Bridge real mode has not yet been verified against Windows OBS hardware; GitHub CI uses an emulated OBS WebSocket v5 server. The Electron native distribution remains pending.
- OBS metrics are sampled at a 3-second interval when authenticated; bitrate is unavailable until a measured bitrate source is implemented.
- Comments are currently sample/hand-imported data; real YouTube/Twitch live comment APIs are not yet connected.

## Web Console

- Web Console reads local or bundled files in the supported session/log/report shapes.
- Files with unsupported shapes may show parse warnings.
- Mixed source files can produce source compatibility warnings.

## PC Standalone

- Camera, screen/window, and microphone checks depend on browser permission support.
- RTMP/RTMPS target validation is local validation only in the browser bundle.
- The browser bundle does not provide a signed native encoder or store-distributed installer.
- The separate development transmitter server (`scripts/serve-pc-standalone.mjs`) is not yet wired to the released browser UI. It is not a completed streaming edition.
- Its local transmitter API requires a loopback Host header; state-changing calls require a matching local Origin. `start` requires JSON, and `chunk` requires octet-stream. Cross-origin pages cannot start or stop the transmitter through this API.
- Runtime stream key input is not saved.

## Mobile

- Mobile direct bundle opens the Mobile Web/PWA edition.
- Android source is included for local build work, but the direct bundle is not a signed APK release.
- Camera/microphone checks require explicit user action and browser permission support.
- Browser-only Mobile does not claim native RTMP transmission by itself.
