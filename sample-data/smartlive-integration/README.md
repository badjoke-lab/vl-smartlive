# SmartLive four-edition integration fixtures

These fixtures validate cross-edition local-first integration for:
- `obs-bridge/`
- `pc-standalone/`
- `mobile-android/`
- `combined/`

Each edition folder includes the six SmartLive output files:
`session.json`, `comments.jsonl`, `alerts.jsonl`, `stream-state.jsonl`, `report.md`, `report.json`.

Safety constraints:
- Credentials are never included.
- Runtime stream identifiers are never included.
- Query values such as token/password/key are redacted.
- RTMP examples are redacted examples only.
