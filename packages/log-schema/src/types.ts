import type {
  ALERT_SEVERITIES,
  ALERT_SOURCES,
  ALERT_TYPES,
  COMMENT_LABELS,
  COMMENT_PRIORITIES,
  HOLD_REASONS,
  LOG_SCHEMA_VERSION,
  NETWORK_QUALITIES,
  SMARTLIVE_APP_IDS,
  SMARTLIVE_PLATFORMS,
} from "./constants";

export type LogSchemaVersion = typeof LOG_SCHEMA_VERSION;
export type SmartLiveAppId = (typeof SMARTLIVE_APP_IDS)[number];
export type SmartLivePlatform = (typeof SMARTLIVE_PLATFORMS)[number];
export type CommentLabel = (typeof COMMENT_LABELS)[number];
export type CommentPriority = (typeof COMMENT_PRIORITIES)[number];
export type HoldReason = (typeof HOLD_REASONS)[number];
export type AlertType = (typeof ALERT_TYPES)[number];
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export type AlertSource = (typeof ALERT_SOURCES)[number];
export type NetworkQuality = (typeof NETWORK_QUALITIES)[number];

export type SmartLiveMode =
  | "obs_bridge"
  | "pc_standalone"
  | "android_live"
  | "web_console_review"
  | "mock";

export type SmartLiveSessionStatus =
  | "created"
  | "live"
  | "ended"
  | "stopped"
  | "crashed"
  | "unknown";

export type CommentSourceType =
  | "mock"
  | "youtube_live_chat"
  | "twitch_chat"
  | "custom_input"
  | "imported_log"
  | "unknown";

export type SmartLiveBaseLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  createdAt?: string;
};

export type VideoSourceInfo = {
  label?: string;
  resolution?: string;
  fps?: number;
};

export type AudioSourceInfo = {
  label?: string;
  sampleRate?: number;
  channels?: number;
};

export type ObsSourceInfo = {
  host?: string;
  port?: number;
  currentSceneName?: string;
};

export type SessionCounters = {
  commentsTotal: number;
  questionsTotal: number;
  audioIssuesTotal: number;
  videoIssuesTotal: number;
  dangerHeldTotal: number;
  alertsTotal: number;
  readAloudTotal: number;
};

export type SmartLiveSessionLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  platform: SmartLivePlatform;
  mode: SmartLiveMode;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  status: SmartLiveSessionStatus;
  source: {
    video?: VideoSourceInfo;
    audio?: AudioSourceInfo;
    obs?: ObsSourceInfo;
  };
  output: {
    targetType: "rtmp" | "rtmps" | "obs" | "mock" | "unknown";
    targetLabel?: string;
    resolution?: string;
    fps?: number;
    videoBitrateKbps?: number;
    audioBitrateKbps?: number;
  };
  counters: SessionCounters;
  settingsSnapshot?: Record<string, unknown>;
  notes?: string;
};

export type SmartLiveCommentLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  commentId: string;
  timestamp: string;
  platform: SmartLivePlatform;
  sourceType: CommentSourceType;
  user: {
    id?: string;
    displayName: string;
    isModerator?: boolean;
    isOwner?: boolean;
    isMember?: boolean;
  };
  text: string;
  normalizedText?: string;
  language?: "ja" | "en" | "unknown";
  labels: CommentLabel[];
  score: number;
  priority: CommentPriority;
  readAloud: {
    allowed: boolean;
    queued: boolean;
    read: boolean;
    held: boolean;
    holdReason?: HoldReason;
  };
  moderation: {
    hidden: boolean;
    blocked: boolean;
    reason?: string;
  };
  handled: boolean;
  pinned: boolean;
};

export type SmartLiveAlertLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  alertId: string;
  timestamp: string;
  type: AlertType;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  message: string;
  relatedCommentId?: string;
  relatedStateId?: string;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
};

export type SmartLiveStreamStateLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  stateId: string;
  timestamp: string;
  live: boolean;
  recording?: boolean;
  currentSceneName?: string;
  metrics: {
    droppedFrames?: number;
    skippedFrames?: number;
    cpuUsagePercent?: number;
    memoryUsageMb?: number;
    bitrateKbps?: number;
    fps?: number;
    audioLevel?: number;
    networkQuality?: NetworkQuality;
    batteryPercent?: number;
    charging?: boolean;
  };
  raw?: Record<string, unknown>;
};

export type ReportHighlight = {
  timestamp?: string;
  commentId?: string;
  text: string;
  reason: "question" | "highlight" | "manual" | "issue" | "unknown";
};

export type ReportIssue = {
  type: "audio" | "video" | "network" | "system" | "comment" | "unknown";
  count: number;
  message: string;
  relatedAlertIds?: string[];
  relatedCommentIds?: string[];
};

export type SmartLiveReportLog = {
  schemaVersion: string;
  appId: SmartLiveAppId;
  appVersion: string;
  sessionId: string;
  reportId: string;
  createdAt: string;
  summary: {
    startedAt?: string;
    endedAt?: string;
    durationSec?: number;
    platform: SmartLivePlatform;
    mode: SmartLiveMode;
  };
  counts: {
    commentsTotal: number;
    questionsTotal: number;
    audioIssuesTotal: number;
    videoIssuesTotal: number;
    dangerHeldTotal: number;
    alertsTotal: number;
    readAloudTotal: number;
    highlightsTotal: number;
  };
  highlights: ReportHighlight[];
  issues: ReportIssue[];
  notes: string[];
  markdownPath?: string;
};

export type LogValidationError = {
  path: string;
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type LogValidationResult = {
  valid: boolean;
  errors: LogValidationError[];
};
