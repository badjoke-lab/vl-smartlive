import type {
  ReportHighlight,
  ReportIssue,
  SmartLiveAlertLog,
  SmartLiveCommentLog,
  SmartLiveSessionLog,
} from "@vl-smartlive/log-schema";
import type { ReportCounts, ReportSummary } from "./types";

export function summarizeCounts(comments: SmartLiveCommentLog[], alerts: SmartLiveAlertLog[]): ReportCounts {
  return {
    commentsTotal: comments.length,
    questionsTotal: comments.filter((comment) => comment.labels.includes("question")).length,
    audioIssuesTotal: comments.filter((comment) => comment.labels.includes("audio_issue")).length,
    videoIssuesTotal: comments.filter((comment) => comment.labels.includes("video_issue")).length,
    dangerHeldTotal: comments.filter(
      (comment) => comment.labels.includes("danger") || comment.readAloud.held,
    ).length,
    alertsTotal: alerts.length,
    readAloudTotal: comments.filter((comment) => comment.readAloud.read || comment.readAloud.queued).length,
    highlightsTotal: comments.filter((comment) => comment.labels.includes("highlight")).length,
  };
}

export function summarizeSession(session: SmartLiveSessionLog): ReportSummary {
  return {
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSec: session.durationSec,
    platform: session.platform,
    mode: session.mode,
  };
}

export function collectHighlights(comments: SmartLiveCommentLog[]): ReportHighlight[] {
  return comments
    .filter((comment) => comment.labels.includes("highlight") || comment.labels.includes("question"))
    .slice(0, 10)
    .map((comment) => ({
      timestamp: comment.timestamp,
      commentId: comment.commentId,
      text: `${comment.user.displayName}: ${comment.text}`,
      reason: comment.labels.includes("question") ? "question" : "highlight",
    }));
}

export function collectIssues(
  comments: SmartLiveCommentLog[],
  alerts: SmartLiveAlertLog[],
): ReportIssue[] {
  const issues: ReportIssue[] = [];

  const audioComments = comments.filter((comment) => comment.labels.includes("audio_issue"));
  if (audioComments.length) {
    issues.push({
      type: "audio",
      count: audioComments.length,
      message: "音声に関する視聴者コメントがありました。",
      relatedCommentIds: audioComments.map((comment) => comment.commentId).slice(0, 20),
      relatedAlertIds: alerts
        .filter((alert) => alert.type === "comment_audio_issue")
        .map((alert) => alert.alertId),
    });
  }

  const videoComments = comments.filter((comment) => comment.labels.includes("video_issue"));
  if (videoComments.length) {
    issues.push({
      type: "video",
      count: videoComments.length,
      message: "映像に関する視聴者コメントがありました。",
      relatedCommentIds: videoComments.map((comment) => comment.commentId).slice(0, 20),
      relatedAlertIds: alerts
        .filter((alert) => alert.type === "comment_video_issue")
        .map((alert) => alert.alertId),
    });
  }

  const heldComments = comments.filter((comment) => comment.readAloud.held);
  if (heldComments.length) {
    issues.push({
      type: "comment",
      count: heldComments.length,
      message: "読み上げ保留されたコメントがありました。",
      relatedCommentIds: heldComments.map((comment) => comment.commentId).slice(0, 20),
      relatedAlertIds: alerts
        .filter((alert) => alert.type === "danger_comment_held")
        .map((alert) => alert.alertId),
    });
  }

  return issues;
}
