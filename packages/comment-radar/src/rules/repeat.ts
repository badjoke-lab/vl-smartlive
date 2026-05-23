import type { RecentComment } from "../types";

function toTimeMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isRepeatCandidate(
  normalizedText: string,
  timestamp: string,
  recentComments: RecentComment[] = [],
  userId?: string,
  userName?: string,
): boolean {
  if (!normalizedText) return false;

  const now = toTimeMs(timestamp);
  const recentSameByUser = recentComments.filter((comment) => {
    const sameUser = userId
      ? comment.userId === userId
      : userName
        ? comment.userName === userName
        : false;
    const sameText = (comment.normalizedText ?? comment.text) === normalizedText;
    const within30sec = Math.abs(now - toTimeMs(comment.timestamp)) <= 30_000;
    return sameUser && sameText && within30sec;
  });

  if (recentSameByUser.length >= 2) return true;

  const recentSameOverall = recentComments.filter((comment) => {
    const sameText = (comment.normalizedText ?? comment.text) === normalizedText;
    const within15sec = Math.abs(now - toTimeMs(comment.timestamp)) <= 15_000;
    return sameText && within15sec;
  });

  return recentSameOverall.length >= 4;
}
