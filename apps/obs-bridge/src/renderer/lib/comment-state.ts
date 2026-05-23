// Typed state model for OBS Bridge comment UI.

export type ObsBridgeCommentUiState = {
  commentMode: "raw" | "radar";
  activeRadarGroup: string;
  search: string;
  filter: string;
};
