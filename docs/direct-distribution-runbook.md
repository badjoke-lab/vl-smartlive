# Direct distribution runbook

This runbook covers local direct-distribution bundles generated from this repository.

## Build direct bundles

```bash
pnpm install
pnpm run release:direct
```

Generated folders:

```text
dist/direct-release/obs-bridge
dist/direct-release/web-console
dist/direct-release/pc-standalone
dist/direct-release/mobile
```

## Validate bundles

```bash
pnpm run direct-release:check
pnpm run check
```

The direct release check verifies:

- all four edition folders exist
- each edition includes `START_HERE.md`, `server.mjs`, and platform start scripts
- each edition includes its app files
- shared packages, reference files, and sample data are present
- blocked unsafe markers are not embedded in generated direct bundles
- OBS Bridge direct bundle does not include blocked OBS control operation names

## Start an edition

macOS:

```bash
cd dist/direct-release/obs-bridge
./start-macos.command
```

Linux:

```bash
cd dist/direct-release/obs-bridge
./start-linux.sh
```

Windows:

```bat
cd dist\direct-release\obs-bridge
start-windows.cmd
```

Fallback for all platforms:

```bash
node server.mjs
```

The same start pattern applies to `web-console`, `pc-standalone`, and `mobile`.

## Edition checks

### OBS Bridge

- Open the local URL shown by the start script.
- Confirm comments are visible by default.
- Confirm Raw/Radar controls are visible.
- Confirm OBS status is read-only in this bundle.
- Confirm runtime credentials are not saved or exported.

### Web Console

- Open the local URL shown by the start script.
- Load bundled sample data or local session files.
- Confirm session, comments, alerts, stream-state, report markdown, and report JSON sections render.

### PC Standalone

- Open the local URL shown by the start script.
- Use camera/screen/microphone checks when browser permissions are available.
- Validate RTMP/RTMPS target locally.
- Confirm comment controls and download actions are available.

### Mobile

- Open the local URL shown by the start script.
- Load bundled sample data.
- Confirm comments are visible by default.
- Confirm bottom navigation moves between sections.
- Confirm camera/microphone checks only run after explicit button presses.

## Release asset refresh

After validation, create zip files from `dist/direct-release` and generate checksums:

```bash
cd dist/direct-release
rm -f *.zip SHA256SUMS.txt
zip -r obs-bridge.zip obs-bridge
zip -r web-console.zip web-console
zip -r pc-standalone.zip pc-standalone
zip -r mobile.zip mobile
for z in obs-bridge.zip web-console.zip pc-standalone.zip mobile.zip; do unzip -tq "$z" || exit 1; done
shasum -a 256 obs-bridge.zip web-console.zip pc-standalone.zip mobile.zip > SHA256SUMS.txt
```
