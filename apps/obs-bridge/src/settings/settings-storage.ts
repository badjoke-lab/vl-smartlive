import { OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS } from "./settings-defaults";
import { sanitizeObsBridgeSafeSettings } from "./settings-sanitize";
import type { ObsBridgeSafeSettings } from "./settings-types";

export const OBS_BRIDGE_SETTINGS_STORAGE_KEY = "smartlive.obsBridge.settings.v0.1";

function getStorageSafe() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadObsBridgeSafeSettings() {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] as string[] };
  try {
    const raw = storage.getItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY);
    if (!raw) return { status: "not_saved", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] as string[] };
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeObsBridgeSafeSettings(parsed);
    return { status: "loaded", settings: sanitized.settings, excludedKeys: sanitized.excludedKeys };
  } catch {
    return { status: "not_saved", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] as string[] };
  }
}

export function saveObsBridgeSafeSettings(input: unknown) {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", excludedKeys: [] as string[] };
  const sanitized = sanitizeObsBridgeSafeSettings(input);
  const payload = { ...sanitized.settings, lastSavedAt: new Date().toISOString() };
  storage.setItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  return { status: "saved", settings: sanitized.settings, excludedKeys: sanitized.excludedKeys };
}

export function resetObsBridgeSafeSettings() {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS };
  storage.removeItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY);
  return { status: "reset", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS as ObsBridgeSafeSettings };
}
