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

This repository contains the source workspace for VL SmartLive. Release bundles are prepared separately per edition.

## Current status

Core source and workspace structure are available for all four editions.

## Next step

Prepare per-edition release artifacts and distribution bundles.
