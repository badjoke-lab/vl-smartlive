export const LOG_SCHEMA_VERSION = "smartlive.log.v0.1" as const;

export const SMARTLIVE_APP_IDS = [
  "obs-bridge",
  "studio",
  "console",
  "mobile",
  "pc-standalone",
  "web-console",
  "android",
  "unknown",
] as const;

export const SMARTLIVE_PLATFORMS = [
  "youtube",
  "twitch",
  "kick",
  "twitcasting",
  "whowatch",
  "custom_rtmp",
  "mock",
  "unknown",
] as const;

export const COMMENT_LABELS = [
  "normal",
  "question",
  "audio_issue",
  "video_issue",
  "danger",
  "highlight",
  "spam_candidate",
  "url_detected",
  "ng_word",
  "personal_info_candidate",
  "long_message",
  "repeat_candidate",
] as const;

export const COMMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const HOLD_REASONS = [
  "url_detected",
  "ng_word",
  "danger_score",
  "personal_info_candidate",
  "long_message",
  "repeat_candidate",
  "manual_hold",
  "unknown",
] as const;

export const ALERT_TYPES = [
  "obs_disconnected",
  "obs_connected",
  "stream_started",
  "stream_stopped",
  "stream_inactive",
  "audio_low",
  "audio_missing",
  "high_cpu",
  "dropped_frames",
  "bitrate_low",
  "comment_audio_issue",
  "comment_video_issue",
  "danger_comment_held",
  "log_save_error",
  "report_created",
  "unknown",
] as const;

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;

export const ALERT_SOURCES = [
  "obs",
  "comment_radar",
  "system",
  "storage",
  "report",
  "manual",
  "unknown",
] as const;

export const NETWORK_QUALITIES = [
  "unknown",
  "good",
  "unstable",
  "poor",
  "offline",
] as const;
