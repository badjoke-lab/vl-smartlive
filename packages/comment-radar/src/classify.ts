import type { CommentLabel } from "@vl-smartlive/log-schema";
import { jaDictionary } from "./dictionaries/ja";
import { enDictionary } from "./dictionaries/en";
import { normalizeCommentText } from "./normalize";
import { getPriority, getRepresentativeLabel } from "./priority";
import { getReadAloudState } from "./read-aloud";
import { detectPersonalInfo } from "./rules/personal-info";
import { isLongMessage } from "./rules/long-message";
import { isRepeatCandidate } from "./rules/repeat";
import { detectUrl } from "./rules/url";
import { scoreLabels } from "./scoring";
import type { ClassifiedComment, ClassifyCommentInput, ClassificationReason } from "./types";

function addLabel(
  labels: Set<CommentLabel>,
  reasons: ClassificationReason[],
  label: CommentLabel,
  matched: string,
  ruleId: string,
  scoreDelta: number,
): void {
  labels.add(label);
  reasons.push({ label, matched, ruleId, scoreDelta });
}

function includesAny(text: string, words: readonly string[]): string | undefined {
  return words.find((word) => word && text.includes(word));
}

function hasRepeatedSymbols(text: string): boolean {
  return /(.)\1{7,}/.test(text);
}

export function classifyComment(input: ClassifyCommentInput): ClassifiedComment {
  const normalizedText = normalizeCommentText(input.text);
  const labels = new Set<CommentLabel>();
  const reasons: ClassificationReason[] = [];
  const lower = normalizedText.toLowerCase();

  const dictionary = input.language === "en" ? enDictionary : jaDictionary;
  const userNgWords = input.userNgWords ?? [];

  const url = detectUrl(normalizedText);
  if (url) addLabel(labels, reasons, "url_detected", url, "rule:url", 85);

  const personalInfo = detectPersonalInfo(normalizedText, dictionary.personalInfoHints);
  if (personalInfo) addLabel(labels, reasons, "personal_info_candidate", personalInfo, "rule:personal-info", 95);

  const userNg = includesAny(normalizedText, userNgWords);
  if (userNg) addLabel(labels, reasons, "ng_word", userNg, "rule:user-ng-word", 100);

  const danger = includesAny(normalizedText, dictionary.danger);
  if (danger) addLabel(labels, reasons, "danger", danger, "dict:danger", 100);

  if (normalizedText.includes("?") || normalizedText.includes("？")) {
    addLabel(labels, reasons, "question", "?", "rule:question-mark", 60);
  }

  const question = includesAny(normalizedText, dictionary.question);
  if (question) addLabel(labels, reasons, "question", question, "dict:question", 60);

  const audio = includesAny(normalizedText, dictionary.audioIssue);
  if (audio) addLabel(labels, reasons, "audio_issue", audio, "dict:audio-issue", 80);

  const video = includesAny(normalizedText, dictionary.videoIssue);
  if (video) addLabel(labels, reasons, "video_issue", video, "dict:video-issue", 80);

  const highlight = includesAny(normalizedText, dictionary.highlight);
  if (highlight) addLabel(labels, reasons, "highlight", highlight, "dict:highlight", 40);

  if (isLongMessage(normalizedText)) {
    addLabel(labels, reasons, "long_message", ">=120 chars", "rule:long-message", 40);
  }

  if (hasRepeatedSymbols(normalizedText)) {
    addLabel(labels, reasons, "spam_candidate", "repeated symbols", "rule:spam-repeated-symbols", 50);
  }

  if (isRepeatCandidate(normalizedText, input.timestamp, input.recentComments, input.userId, input.userName)) {
    addLabel(labels, reasons, "repeat_candidate", "recent duplicate", "rule:repeat", 50);
  }

  // URL + suspicious wording is treated as a danger candidate.
  if (url && (lower.includes("見て") || lower.includes("click") || lower.includes("今すぐ"))) {
    addLabel(labels, reasons, "danger", url, "rule:url-danger-combo", 100);
  }

  if (labels.size === 0) {
    addLabel(labels, reasons, "normal", "fallback", "rule:fallback-normal", 10);
  }

  const labelList = [...labels];
  const score = scoreLabels(labelList);
  const priority = getPriority(labelList);
  const representativeLabel = getRepresentativeLabel(labelList);
  const readAloud = getReadAloudState(labelList, input.readAloudEnabled ?? false);

  return {
    normalizedText,
    labels: labelList,
    representativeLabel,
    score,
    priority,
    readAloud,
    reasons,
  };
}
