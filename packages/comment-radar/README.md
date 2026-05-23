# @vl-smartlive/comment-radar

Local-first rule-based comment classification for SmartLive / VL SmartLive.

## Scope

This package classifies comments for:

- Raw / Radar display
- Labels
- Representative category
- Priority
- Score
- Read-aloud hold decisions

## v0.1 labels

```text
normal
question
audio_issue
video_issue
danger
highlight
spam_candidate
url_detected
ng_word
personal_info_candidate
long_message
repeat_candidate
```

## Safety

This package does not auto-delete, auto-ban, or report comments to a platform. It only labels comments and decides whether a comment should be held from read-aloud.

## Check

```bash
pnpm run comment-radar:check
```
