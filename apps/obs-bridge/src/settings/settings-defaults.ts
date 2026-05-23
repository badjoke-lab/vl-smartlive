import type { ObsBridgeSafeSettings } from "./settings-types";

export const OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS: ObsBridgeSafeSettings = {
  obsHost: "127.0.0.1",
  obsPort: 4455,
  obsClientMode: "mock",
  radarEnabled: true,
  mockCommentsEnabled: true,
  readAloudEnabled: false,
  longMessageLimit: 120,
  preferredCommentMode: "raw",
  preferredCommentFilter: "all",
};
