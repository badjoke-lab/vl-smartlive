import { LOG_SCHEMA_VERSION } from "@vl-smartlive/log-schema";
import type { CommentLabel, HoldReason, SmartLiveCommentLog } from "@vl-smartlive/log-schema";
import type { BuildCommentLogsInput, CommentLogBuildResult, RendererCommentInput } from "./comment-log-types";

const APP_VERSION = "0.1.0";

const HOLD_REASON_SET: ReadonlySet<string> = new Set([
  "url_detected",
  "ng_word",
  "danger_score",
  "personal_info_candidate",
  "long_message",
  "repeat_candidate",
  "manual_hold",
  "unknown",
]);

function toIsoTimestamp(comment: RendererCommentInput, fallbackIso: string): string {
  if (comment.timestamp && !Number.isNaN(Date.parse(comment.timestamp))) return new Date(comment.timestamp).toISOString();
  return fallbackIso;
}

function sanitizeLabels(labels: string[]): CommentLabel[] {
  const allowed: CommentLabel[] = [
    "normal", "question", "audio_issue", "video_issue", "danger", "highlight",
    "spam_candidate", "url_detected", "ng_word", "personal_info_candidate", "long_message", "repeat_candidate",
  ];
  return labels.filter((label): label is CommentLabel => allowed.includes(label as CommentLabel));
}

function normalizeHoldReason(value: string | undefined): HoldReason | undefined {
  if (!value) return undefined;
  return HOLD_REASON_SET.has(value) ? (value as HoldReason) : "unknown";
}

export function buildCommentLogs(input: BuildCommentLogsInput): CommentLogBuildResult {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const warnings: string[] = [];

  const entries: SmartLiveCommentLog[] = input.comments.map((comment) => {
    const labels = sanitizeLabels(comment.labels ?? []);
    if (labels.length === 0) warnings.push(`comment ${comment.id} has no known labels; defaulted to normal`);

    return {
      schemaVersion: LOG_SCHEMA_VERSION,
      appId: "obs-bridge",
      appVersion: APP_VERSION,
      sessionId: input.sessionId,
      commentId: comment.id,
      timestamp: toIsoTimestamp(comment, createdAt),
      platform: input.platform ?? "mock",
      sourceType: "mock",
      user: { displayName: comment.user },
      text: comment.text,
      labels: labels.length ? labels : ["normal"],
      score: comment.priority === "urgent" ? 1 : comment.priority === "high" ? 0.8 : comment.priority === "normal" ? 0.5 : 0.2,
      priority: comment.priority,
      readAloud: {
        allowed: !comment.held,
        queued: Boolean(comment.queued),
        read: Boolean(comment.read),
        held: Boolean(comment.held),
        holdReason: normalizeHoldReason(comment.holdReason),
      },
      moderation: {
        hidden: false,
        blocked: false,
      },
      handled: Boolean(comment.handled),
      pinned: Boolean(comment.pinned),
    };
  });

  return { entries, skipped: 0, warnings };
}
