import type { CommentLabel, CommentPriority } from "@vl-smartlive/log-schema";

const REPRESENTATIVE_ORDER: CommentLabel[] = [
  "danger",
  "personal_info_candidate",
  "ng_word",
  "url_detected",
  "audio_issue",
  "video_issue",
  "question",
  "spam_candidate",
  "repeat_candidate",
  "long_message",
  "highlight",
  "normal",
];

export function getRepresentativeLabel(labels: CommentLabel[]): CommentLabel {
  return REPRESENTATIVE_ORDER.find((label) => labels.includes(label)) ?? "normal";
}

export function getPriority(labels: CommentLabel[]): CommentPriority {
  if (labels.some((label) => ["danger", "personal_info_candidate", "ng_word"].includes(label))) {
    return "urgent";
  }

  if (labels.some((label) => ["audio_issue", "video_issue", "question"].includes(label))) {
    return "high";
  }

  if (labels.every((label) => ["spam_candidate", "repeat_candidate"].includes(label))) {
    return "low";
  }

  return "normal";
}
