export function createSettingsPersistenceSummary({ status, lastSavedAt = null, safeKeysSaved = [], excludedKeys = [] }) {
  const byStatus = {
    saved: "Safe settings saved locally. OBS password is never saved.",
    not_saved: "No saved settings found yet. Using defaults.",
    unavailable: "Local storage unavailable in this runtime.",
    reset: "Saved safe settings were reset to defaults.",
    loaded: "Safe settings restored from local storage.",
  };

  return {
    status,
    lastSavedAt,
    safeKeysSaved,
    excludedKeys,
    message: byStatus[status] || "Settings persistence status unknown.",
  };
}
