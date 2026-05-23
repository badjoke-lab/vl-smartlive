# VL SmartLive

VL SmartLive is a local-first live production toolkit built around four editions for different operating needs.

## Editions

1. **OBS Bridge**
   - Companion interface for OBS-connected workflows.
   - Focuses on operational visibility and safe local handling of runtime data.

2. **Web Console**
   - Browser-based monitoring and review console.
   - Supports local file-based inspection of session outputs.

3. **PC Standalone**
   - Desktop-oriented operator interface.
   - Prioritizes streamlined local operation and clear runtime status.

4. **Mobile**
   - Phone-first interface for lightweight field operation.
   - Designed for practical on-device workflows.

## Quick start

```bash
pnpm install
pnpm run check
pnpm run test
```

## Requirements

- Node.js 20+
- pnpm 9+

## Privacy and safety

- Runtime credentials should remain runtime-only.
- Sensitive values must not be logged, exported, or embedded in artifacts.
- Public docs and code are reviewed with a repository-wide surface scan.

## Distribution

This repository contains the source workspace for VL SmartLive.

The current source-bundle release is available at:

- https://github.com/badjoke-lab/vl-smartlive/releases/tag/v0.1.0-source

Included source bundles:

- OBS Bridge
- Web Console
- PC Standalone
- Mobile

These bundles are source archives for local review and development. They are not signed installers or store builds.

## Current status

Core source and workspace structure are available for all four editions.

## Next step

Continue per-edition runtime checks and prepare edition-specific packaging notes.