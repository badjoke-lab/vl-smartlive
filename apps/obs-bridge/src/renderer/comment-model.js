export const labelDisplay = {
  normal: "通常",
  question: "質問",
  audio_issue: "音声",
  video_issue: "映像",
  danger: "注意",
  highlight: "盛上り",
  spam_candidate: "スパム候補",
  url_detected: "URL",
  ng_word: "NG",
  personal_info_candidate: "個人情報候補",
  long_message: "長文",
  repeat_candidate: "連投候補",
};

export const initialComments = [
  {
    id: "c-001",
    time: "12:01",
    user: "viewerA",
    text: "マイク小さいかも",
    labels: ["audio_issue"],
    priority: "high",
    held: false,
    queued: true,
    handled: false,
    pinned: false,
  },
  {
    id: "c-002",
    time: "12:02",
    user: "viewerB",
    text: "これはどうやって設定するの？",
    labels: ["question"],
    priority: "high",
    held: false,
    queued: true,
    handled: false,
    pinned: false,
  },
  {
    id: "c-003",
    time: "12:03",
    user: "viewerC",
    text: "http://example.com 見て",
    labels: ["url_detected", "danger"],
    priority: "urgent",
    held: true,
    holdReason: "url_detected",
    queued: false,
    handled: false,
    pinned: false,
  },
  {
    id: "c-004",
    time: "12:04",
    user: "viewerD",
    text: "すごい",
    labels: ["highlight"],
    priority: "normal",
    held: false,
    queued: true,
    handled: false,
    pinned: false,
  },
  {
    id: "c-005",
    time: "12:05",
    user: "viewerE",
    text: "画面止まってる？",
    labels: ["video_issue", "question"],
    priority: "high",
    held: false,
    queued: true,
    handled: false,
    pinned: false,
  },
  {
    id: "c-006",
    time: "12:06",
    user: "viewerF",
    text: "test@example.com",
    labels: ["personal_info_candidate"],
    priority: "urgent",
    held: true,
    holdReason: "personal_info_candidate",
    queued: false,
    handled: false,
    pinned: false,
  },
];

export const radarGroups = [
  { id: "urgent", label: "Urgent", match: (comment) => comment.priority === "urgent" || comment.held },
  { id: "question", label: "Questions", match: (comment) => comment.labels.includes("question") },
  { id: "audio_issue", label: "Audio", match: (comment) => comment.labels.includes("audio_issue") },
  { id: "video_issue", label: "Video", match: (comment) => comment.labels.includes("video_issue") },
  { id: "highlight", label: "Highlights", match: (comment) => comment.labels.includes("highlight") },
  { id: "held", label: "Held", match: (comment) => comment.held },
  { id: "all", label: "All", match: () => true },
];

export function summarizeComments(comments) {
  return {
    commentsTotal: comments.length,
    questionsTotal: comments.filter((comment) => comment.labels.includes("question")).length,
    audioIssuesTotal: comments.filter((comment) => comment.labels.includes("audio_issue")).length,
    videoIssuesTotal: comments.filter((comment) => comment.labels.includes("video_issue")).length,
    dangerHeldTotal: comments.filter((comment) => comment.held || comment.labels.includes("danger")).length,
    alertsTotal: comments.filter((comment) => comment.priority === "urgent" || comment.labels.includes("audio_issue") || comment.labels.includes("video_issue")).length,
    queuedTotal: comments.filter((comment) => comment.queued && !comment.held && !comment.handled).length,
    highlightsTotal: comments.filter((comment) => comment.labels.includes("highlight")).length,
  };
}

export function createReportText(comments) {
  const summary = summarizeComments(comments);
  return `# SmartLive 配信レポート

## Counts

- Comments: ${summary.commentsTotal}
- Questions: ${summary.questionsTotal}
- Audio issues: ${summary.audioIssuesTotal}
- Video issues: ${summary.videoIssuesTotal}
- Held comments: ${summary.dangerHeldTotal}
- Alerts: ${summary.alertsTotal}
- Highlights: ${summary.highlightsTotal}

## Notes

- This is a workspace local UI preview.
- Comments are visible by default on the Live screen.`;
}
