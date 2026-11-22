# Known issues

This document lists public user-facing limitations for the current direct-distribution bundles.

## General

- As of 2026-10-31, manual checks on physical Windows, OBS and Android devices are **waived for development progression**. CI, protocol emulators, package checks and security checks are required; physical-device behavior is **NOT TESTED**, not certified.
- Builds may be released as device-unverified previews when CI passes. Passing CI does not prove RTMP ingest, OBS hardware behavior or Android runtime stability.

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
- **Optional YouTube public live chat v0.1 adapter:** user enters their own API key and a currently active public live video. Browser requests `videos.list` for `activeLiveChatId` and `liveChatMessages.list` for comments, respecting API-provided `pollingIntervalMillis`. Received comments are marked `youtube_live_api`, rendered in Raw/Radar and written to the opt-in incremental journal when its folder access is active. Held URL/email/long-message candidates do not enter the read-aloud queue. This is not an OBS start/stop operation.
- The YouTube API integration is **CI mock verified, not verified against a live YouTube broadcast**. It requires Google Cloud YouTube Data API v3 enablement and a user-owned key, may fail due to CORS/origin restrictions, quota, disabled chat or non-public stream. No OAuth, Twitch adapter or managed API key is provided. API key uses `x-goog-api-key` header and is not saved, logged, exported or put in query strings. Usage consumes the user's free API quota; do not enable billable services.

- OBS Bridge can write prepared six-file session snapshots to a user-selected folder via Chrome/Edge File System Access API. Unavailable browsers must use manual download.
- **Opt-in incremental logging:** After starting a session, a separate folder-selection button initializes six files. Subsequent OBS UI-state updates and manually entered/imported comments are appended in order as JSONL, with readback validation. Ending the session updates metadata and reports from successfully written event counts. Existing session files are never silently overwritten.
- Incremental logging is **not fully crash-safe**: browser termination, suspended tab, permission loss and interrupted writes can leave an incomplete session. The new manual recovery panel can inspect complete journals, resume appending after an explicit gap marker, or finalize from verified on-disk event counts as `interrupted` with unknown end time. It cannot reconstruct lost events or actual termination time. JSONL with truncated/invalid records or missing files is deliberately refused without rewriting it; recovery requires renewed folder authorization, and has not been device verified. Multiple tabs writing the same session are not supported. There is no automatic recovery or real live-comment API. Logging starts only after explicit folder authorization; earlier UI mock events are not backfilled.
- Native browser and Electron filesystem behavior has not been manually verified (device verification waived); CI exercises directory write/readback logic with simulated file handles.

## Web Console

- Web Console reads local or bundled files in the supported session/log/report shapes.
- Files with unsupported shapes may show parse warnings.
- Mixed source files can produce source compatibility warnings.
- Sequential standalone user-file imports retain previously loaded real files; absent files remain Pending instead of being replaced by DEMO fixtures. Import state is in-memory only and resets when a sample is loaded or the page is refreshed.

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
