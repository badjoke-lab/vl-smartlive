import { OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS } from "./settings-defaults";
import { EXCLUDED_SETTINGS_KEYS, SAFE_COMMENT_FILTERS, SAFE_COMMENT_MODES, SAFE_OBS_CLIENT_MODES, type ObsBridgeSafeSettings } from "./settings-types";

const EXCLUDED_PATTERN = /(pass(word)?|token|secret|credential)/i;

export function sanitizeObsBridgeSafeSettings(input: unknown): { settings: ObsBridgeSafeSettings; excludedKeys: string[] } {
  const defaults = OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS;
  const source = (input && typeof input === "object") ? input as Record<string, unknown> : {};
  const excludedKeys = Object.keys(source).filter((key) => EXCLUDED_PATTERN.test(key) || EXCLUDED_SETTINGS_KEYS.includes(key as never));

  const obsHost = typeof source.obsHost === "string" && source.obsHost.trim() ? source.obsHost.trim().slice(0, 255) : defaults.obsHost;
  const obsPortRaw = Number(source.obsPort);
  const obsPort = Number.isFinite(obsPortRaw) ? Math.min(65535, Math.max(1, Math.trunc(obsPortRaw))) : defaults.obsPort;
  const obsClientMode = SAFE_OBS_CLIENT_MODES.includes(source.obsClientMode as never) ? source.obsClientMode as ObsBridgeSafeSettings["obsClientMode"] : defaults.obsClientMode;
  const radarEnabled = typeof source.radarEnabled === "boolean" ? source.radarEnabled : defaults.radarEnabled;
  const mockCommentsEnabled = typeof source.mockCommentsEnabled === "boolean" ? source.mockCommentsEnabled : defaults.mockCommentsEnabled;
  const readAloudEnabled = typeof source.readAloudEnabled === "boolean" ? source.readAloudEnabled : defaults.readAloudEnabled;
  const longMessageLimitRaw = Number(source.longMessageLimit);
  const longMessageLimit = Number.isFinite(longMessageLimitRaw) ? Math.min(500, Math.max(20, Math.trunc(longMessageLimitRaw))) : defaults.longMessageLimit;
  const preferredCommentMode = SAFE_COMMENT_MODES.includes(source.preferredCommentMode as never) ? source.preferredCommentMode as ObsBridgeSafeSettings["preferredCommentMode"] : defaults.preferredCommentMode;
  const preferredCommentFilter = SAFE_COMMENT_FILTERS.includes(source.preferredCommentFilter as never) ? source.preferredCommentFilter as ObsBridgeSafeSettings["preferredCommentFilter"] : defaults.preferredCommentFilter;

  return { settings: { obsHost, obsPort, obsClientMode, radarEnabled, mockCommentsEnabled, readAloudEnabled, longMessageLimit, preferredCommentMode, preferredCommentFilter }, excludedKeys };
}
