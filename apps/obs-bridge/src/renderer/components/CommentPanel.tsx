// Type definitions for the comment panel layer.
// The static shell uses components/comment-panel.js for browser preview.

export type CommentPanelProps = {
  mode: "raw" | "radar";
};

export const commentPanelScope = [
  "always-visible comments",
  "Raw/Radar switching",
  "Held/Queue preview",
  "comment actions",
] as const;
