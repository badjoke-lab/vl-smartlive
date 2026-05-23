import type { CommentLabel, CommentPriority, HoldReason, SmartLiveCommentLog, SmartLivePlatform } from "@vl-smartlive/log-schema";

export type RendererCommentInput = {
  id: string;
  time?: string;
  timestamp?: string;
  user: string;
  text: string;
  labels: CommentLabel[];
  priority: CommentPriority;
  held: boolean;
  holdReason?: HoldReason;
  queued: boolean;
  handled: boolean;
  pinned: boolean;
  read?: boolean;
};

export type PlannedCommentJsonlAppend = {
  targetPath: string;
  lineCount: number;
  preview: string;
  createdAt: string;
};

export type CommentLogBuildResult = {
  entries: SmartLiveCommentLog[];
  skipped: number;
  warnings: string[];
};

export type BuildCommentLogsInput = {
  sessionId: string;
  comments: RendererCommentInput[];
  platform?: SmartLivePlatform;
  createdAt?: string;
};
