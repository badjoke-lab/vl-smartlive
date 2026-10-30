# G2 / O01 Windows OBS Bridge portable preview evidence (2026-10-30)

## Recorded result

- Source PR: [#47](https://github.com/badjoke-lab/vl-smartlive/pull/47), main commit `0c51480b9a27d18d28a53df181d11dd4cf4ce28a`.
- Dedicated Windows workflow: [OBS Bridge Windows Preview #41078514984](https://github.com/badjoke-lab/vl-smartlive/actions/runs/41078514984): **SUCCESS**.
- Repository CI for identical PR commit: **SUCCESS**.
- Built: Electron 45.1.0 / `@electron/packager` 20.3.0, Windows x64.
- Output: `OBS-Bridge-Windows-x64-development-preview` artifact, consisting of `SmartLive-OBS-Bridge-win-x64-preview.zip` and `SHA256SUMS.txt`. Artifact retention: 7 days.
- Windows workflow checked executable presence, WebSocket v5 client inclusion inside `resources/app.asar`, README beside the .exe, ZIP creation and SHA256. The artifact is a development preview **not automatically published as a release**.

## Verified in Windows GitHub Actions

| Check | Status |
|---|---|
| Source and Electron staging prepared from current direct OBS bundle | PASS |
| Electron package Windows x64 / archive created | PASS |
| Executable `SmartLive OBS Bridge.exe` present | PASS |
| Read-only OBS WebSocket JS in Electron app archive | PASS |
| User setup instructions included beside executable | PASS |
| SHA256 file and upload artifact | PASS |
| Basic workspace CI and Node JS protocol emulator test | PASS |

## Manual verification outstanding (NOT TESTED)

- [ ] Windows 10/11 unpack ZIP and double-click `SmartLive OBS Bridge.exe` (with/without SmartScreen warning).
- [ ] App opens real UI (no white/black screen, browser modules load, no local HTTP port clash).
- [ ] OBS Tools → WebSocket Server Settings; authenticate with correct password and see real scene/stream/record/CPU/FPS/skipped frames.
- [ ] Incorrect password does not show Connected or retain the password; stop OBS -> disconnected.
- [ ] Close app -> window and local server exit cleanly; relaunch -> new local server and connection possible.
- [ ] Verify no OBS control request, no exported secret, no external navigation from app.
- [ ] Long-running OBS session, network interruption, Windows hardware, full-screen and DPI behaviors.

**Classification:** O01 build and Windows packaging CI PASS; Windows runtime/hardware verification NOT TESTED; Electron Windows v1.0 and G2 exit NOT COMPLETE. No signed installer or app store distribution.

## Download / reproducibility

Open the linked workflow run, scroll to **Artifacts**, select **OBS-Bridge-Windows-x64-development-preview** while retained. The ZIP contains the executable and `README_WINDOWS.txt`. This download is time-limited; re-run the Windows workflow on main to regenerate. There is no need to enable paid GitHub features.
