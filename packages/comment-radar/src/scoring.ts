import type { CommentLabel } from "@vl-smartlive/log-schema";

const LABEL_SCORE: Record<CommentLabel, number> = {
  normal: 10,
  highlight: 40,
  question: 60,
  audio_issue: 80,
  video_issue: 80,
  url_detected: 85,
  spam_candidate: 50,
  repeat_candidate: 50,
  long_message: 40,
  personal_info_candidate: 95,
  ng_word: 100,
  danger: 100,
};

export function scoreLabels(labels: CommentLabel[]): number {
  const base = Math.max(...labels.map((label) => LABEL_SCORE[label] ?? 0), 0);
  const extra = Math.min(Math.max(labels.length - 1, 0) * 5, 15);
  return Math.min(base + extra, 100);
}
