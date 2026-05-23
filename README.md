# VL SmartLive

VL SmartLive is a local-first live production toolkit built around four editions for different operating needs.

## Editions

1. **OBS Bridge**
   - Companion interface for OBS-connected workflows.
   - Provides live status, comments, Raw/Radar views, logs, and report previews.
   - Keeps OBS operations read-only in this bundle; stream start/stop, scene switching, and recording controls are not included.

2. **Web Console**
   - Browser-based monitoring and review console.
   - Loads local session outputs such as session metadata, comments JSONL, alerts JSONL, stream-state JSONL, and reports.

3. **PC Standalone**
   - Desktop-oriented local operator interface.
   - Provides camera/screen/microphone checks, RTMP/RTMPS target validation, comments, logs, and report export actions.

4. **Mobile**
   - Phone-first local browser/PWA interface.
   - Provides sample data loading, comments, Raw/Radar, device checks, local RTMP/RTMPS validation, logs, and reports.
   - Includes Android source for local Android build work.

## Requirements

- Node.js 20+
- pnpm 9+

## Workspace quick start

```bash
pnpm install
pnpm run release:direct
pnpm run check
```

`pnpm run release:direct` generates four direct-distribution folders under `dist/direct-release/`.

## Direct distribution start

After running `pnpm run release:direct`, each edition folder contains:

- `START_HERE.md`
- `server.mjs`
- `start-macos.command`
- `start-linux.sh`
- `start-windows.cmd`

Start an edition from its folder:

```bash
cd dist/direct-release/obs-bridge
./start-macos.command
```

The same pattern applies to:

- `dist/direct-release/web-console`
- `dist/direct-release/pc-standalone`
- `dist/direct-release/mobile`

Windows users can run `start-windows.cmd`. Linux users can run `./start-linux.sh`. All platforms can also run `node server.mjs`.

## Validation

```bash
pnpm run release:direct
pnpm run direct-release:check
pnpm run check
```

The direct release check verifies required files for all four editions, shared package/reference/sample data presence, direct start files, and blocked unsafe markers.

## Privacy and safety

- Runtime credentials must remain runtime-only.
- OBS password, stream key, tokens, and secret values must not be saved, displayed after entry, logged, exported, or embedded in generated files.
- OBS Bridge remains read-only for OBS status in this bundle.
- No cloud backend, hosted service dependency, account login, or billable third-party API connection is required for the direct bundles.

## Distribution status

This repository supports direct-distribution bundles generated from source.

The direct bundles are not signed installers, store builds, or app-store packages. They are local folders/zips intended for direct download, local review, and local operation with Node.js 20+.

For public operating notes, see:

- `docs/direct-distribution-runbook.md`
- `docs/known-issues.md`
