import { OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS } from "./settings-defaults.js";

export const OBS_BRIDGE_SETTINGS_STORAGE_KEY = "smartlive.obsBridge.settings.v0.1";

function getStorageSafe() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function sanitize(input = {}) {
  const safe = { ...OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS };
  const excludedKeys = [];
  for (const [key, value] of Object.entries(input || {})) {
    const lower = key.toLowerCase();
    if (lower.includes("password") || lower.includes("token") || lower.includes("secret")) {
      excludedKeys.push(key);
      continue;
    }
    if (key in safe) safe[key] = value;
  }
  return { settings: safe, excludedKeys };
}

export function loadObsBridgeSafeSettings() {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] };
  try {
    const raw = storage.getItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY);
    if (!raw) return { status: "not_saved", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] };
    const parsed = JSON.parse(raw);
    const sanitized = sanitize(parsed);
    return { status: "loaded", settings: sanitized.settings, excludedKeys: sanitized.excludedKeys };
  } catch {
    return { status: "not_saved", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS, excludedKeys: [] };
  }
}

export function saveObsBridgeSafeSettings(input) {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", excludedKeys: [] };
  const sanitized = sanitize(input);
  storage.setItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY, JSON.stringify({ ...sanitized.settings, lastSavedAt: new Date().toISOString() }));
  return { status: "saved", settings: sanitized.settings, excludedKeys: sanitized.excludedKeys };
}

export function resetObsBridgeSafeSettings() {
  const storage = getStorageSafe();
  if (!storage) return { status: "unavailable", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS };
  storage.removeItem(OBS_BRIDGE_SETTINGS_STORAGE_KEY);
  return { status: "reset", settings: OBS_BRIDGE_SAFE_SETTINGS_DEFAULTS };
}
