# @vl-smartlive/report-engine

Local post-stream report generation for SmartLive / VL SmartLive.

## Scope

This package converts local logs into:

- `report.json`
- `report.md`

## Inputs

- `session.json`
- `comments.jsonl`
- `alerts.jsonl`
- optional `stream-state.jsonl`

## Outputs

- Summary
- Counts
- Issues
- Highlights
- Notes
- Markdown report

## Check

```bash
pnpm run report-engine:check
```

## Safety

The report engine runs locally. Do not commit real viewer logs or personal information.
