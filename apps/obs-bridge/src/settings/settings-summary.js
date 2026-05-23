export function createSettingsPersistenceSummary({ status, lastSavedAt = null, safeKeysSaved = [], excludedKeys = [] }) {
  const messages = {
    saved: 'Safe settings saved locally. Runtime credentials are never saved.',
    not_saved: 'No saved settings found yet. Using defaults.',
    unavailable: 'Local storage unavailable in this runtime.',
    reset: 'Saved safe settings were reset to defaults.',
    loaded: 'Safe settings restored from local storage.'
  };
  return {
    status,
    lastSavedAt,
    safeKeysSaved,
    excludedKeys,
    message: messages[status] || 'Settings persistence status unknown.'
  };
}
