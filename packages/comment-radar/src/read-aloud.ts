import type { CommentLabel, HoldReason } from "@vl-smartlive/log-schema";

export function getHoldReason(labels: CommentLabel[]): HoldReason | undefined {
  if (labels.includes("url_detected")) return "url_detected";
  if (labels.includes("ng_word")) return "ng_word";
  if (labels.includes("danger")) return "danger_score";
  if (labels.includes("personal_info_candidate")) return "personal_info_candidate";
  if (labels.includes("long_message")) return "long_message";
  if (labels.includes("repeat_candidate")) return "repeat_candidate";
  return undefined;
}

export function getReadAloudState(labels: CommentLabel[], readAloudEnabled = false) {
  const holdReason = getHoldReason(labels);
  const held = Boolean(holdReason);

  return {
    allowed: !held,
    queued: readAloudEnabled && !held,
    read: false as const,
    held,
    ...(holdReason ? { holdReason } : {}),
  };
}
