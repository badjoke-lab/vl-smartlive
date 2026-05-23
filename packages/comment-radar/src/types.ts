import type { CommentLabel, CommentPriority, HoldReason } from "@vl-smartlive/log-schema";

export type CommentRadarLanguage = "ja" | "en" | "unknown";

export type RecentComment = {
  userId?: string;
  userName?: string;
  text: string;
  normalizedText?: string;
  timestamp: string;
};

export type ClassifyCommentInput = {
  text: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  recentComments?: RecentComment[];
  userNgWords?: string[];
  language?: CommentRadarLanguage;
  readAloudEnabled?: boolean;
};

export type ClassificationReason = {
  label: CommentLabel;
  matched: string;
  ruleId: string;
  scoreDelta: number;
};

export type ClassifiedComment = {
  normalizedText: string;
  labels: CommentLabel[];
  representativeLabel: CommentLabel;
  score: number;
  priority: CommentPriority;
  readAloud: {
    allowed: boolean;
    queued: boolean;
    read: false;
    held: boolean;
    holdReason?: HoldReason;
  };
  reasons: ClassificationReason[];
};

export type CommentRadarSettings = {
  radarEnabled: boolean;
  defaultMode: "raw" | "radar";
  readAloudEnabled: boolean;
  holdUrlComments: boolean;
  holdLongMessages: boolean;
  longMessageThreshold: number;
  userNgWords: string[];
};

export const DEFAULT_COMMENT_RADAR_SETTINGS: CommentRadarSettings = {
  radarEnabled: true,
  defaultMode: "raw",
  readAloudEnabled: false,
  holdUrlComments: true,
  holdLongMessages: true,
  longMessageThreshold: 120,
  userNgWords: [],
};
