# @vl-smartlive/log-schema

Common SmartLive / VL SmartLive log schema types, constants, JSONL helpers, sample data, and lightweight validators.

## Scope

This package defines v0.1 schemas for:

- `session.json`
- `comments.jsonl`
- `alerts.jsonl`
- `stream-state.jsonl`
- `report.json`
- `report.md`

## Schema version

```text
smartlive.log.v0.1
```

## Check

```bash
pnpm run log-schema:check
```

## Safety

Do not commit real stream keys, OBS passwords, personal data, or real viewer comment logs.
