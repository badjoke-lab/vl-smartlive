export const SAFE_OBS_CLIENT_MODES = ["mock", "native-readonly"] as const;
export const SAFE_COMMENT_MODES = ["raw", "radar"] as const;
export const SAFE_COMMENT_FILTERS = ["all", "urgent", "question", "audio_issue", "video_issue", "highlight", "held", "handled"] as const;

export type ObsClientMode = (typeof SAFE_OBS_CLIENT_MODES)[number];
export type PreferredCommentMode = (typeof SAFE_COMMENT_MODES)[number];
export type PreferredCommentFilter = (typeof SAFE_COMMENT_FILTERS)[number];

export type ObsBridgeSafeSettings = {
  obsHost: string;
  obsPort: number;
  obsClientMode: ObsClientMode;
  radarEnabled: boolean;
  mockCommentsEnabled: boolean;
  readAloudEnabled: boolean;
  longMessageLimit: number;
  preferredCommentMode: PreferredCommentMode;
  preferredCommentFilter: PreferredCommentFilter;
};

export const EXCLUDED_SETTINGS_KEYS = ["obsPassword", "password", "credential", "credentials", "token", "tokens", "secret", "secrets"] as const;
