# G2 / O02 OBS WebSocket v5 integration evidence — 2026-10-30

## Version and scope

- Implementation PR: [#44](https://github.com/badjoke-lab/vl-smartlive/pull/44), merged to main at `a87e274733f241c6e593529ab44062a656eb05c0`.
- Source: `apps/obs-bridge/src/renderer/lib/obs-readonly-websocket.js`, `apps/obs-bridge/src/renderer/main.js`.
- Test: `scripts/check-obs-readonly-websocket.mjs`.
- CI: [#41076586948](https://github.com/badjoke-lab/vl-smartlive/actions/runs/41076586948) — **SUCCESS** (emulated protocol and existing direct bundle / smoke / security checks).
- Official OBS WebSocket v5 protocol used for independent verification: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md.

## Implemented and verified with emulator

| Check | Evidence | Outcome |
|---|---|---|
| OBS Hello (op 0), Identify (op 1), Identified (op 2) | Mock server emits handshake messages; client performs read-only handshake | PASS in CI |
| SHA-256 + Base64 challenge-response | Independent Node crypto expected value vs browser Web Crypto client result | PASS in CI |
| OBS requests | GetVersion, GetCurrentProgramScene, GetStreamStatus, GetStats, GetRecordStatus | PASS in CI |
| OBS control prohibition | StartStream not on whitelist | PASS in CI |
| Data mapping | Scene name, active stream, recording state, CPU, FPS, skipped frames; missing bitrate as null | PASS in CI |
| Error states | Missing password, rejected authentication, failed request, timeout and socket close | PASS in CI |
| Frontend syntax and preview smoke | GitHub Actions | PASS in CI |

The emulated test is **not an OBS hardware test**, and the HTTP smoke check only verifies local page serving and code presence, not real button interactions.

## Manual acceptance still required (NOT TESTED)

- [ ] Windows machine / OBS Studio v5 WebSocket: successful authenticated local connection.
- [ ] Wrong password rejected with no misleading Connected status and no credentials in logs.
- [ ] Active stream and recording toggle reflected correctly without sending an OBS command.
- [ ] Live scene change observed at the next refresh. Missing metrics reported unavailable.
- [ ] OBS shutdown / network loss → disconnected with stale metrics cleared; retry works.
- [ ] No OBS password, key, full private target URL or authentication challenge response in screenshots and logs.
- [ ] Browser startup and native Electron executable both independently tested; native app currently **not built**.

## Completion status

**O02 code-complete + CI PASS; hardware-verified: NO. G2 exit: NOT MET.**

OBS Bridge contains a working protocol implementation which is used by the browser renderer; local OBS runtime validation and O01 native desktop packaging remain mandatory. This entry is a development audit, not proof of a v1.0 release.
