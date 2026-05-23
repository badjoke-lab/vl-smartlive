# SmartLive OBS Bridge

OBS Bridge is the desktop companion interface for OBS-connected SmartLive workflows. It keeps comments visible by default and focuses on safe local handling of runtime data.

## Included

- Live screen shell
- OBS status and metrics panels
- Always-visible comment panel
- Raw / Radar mode switching
- Held / queue preview
- Logs screen
- Settings screen
- Local sample comments

## Runtime boundaries

- OBS credentials are runtime-only.
- OBS credentials must not be saved, logged, or exported.
- OBS Bridge does not provide stream start/stop, scene switching, or recording controls.
- Local files and reports remain user-controlled.

## Local preview

From repository root:

```bash
pnpm run dev:obs
```

Open:

```text
http://localhost:4174/apps/obs-bridge/
```
