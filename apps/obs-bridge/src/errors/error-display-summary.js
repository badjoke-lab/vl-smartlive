export function buildErrorDisplaySummary(state, settingsSummary) {
  const items = [];
  if (state?.obsClientMode === 'mock') {
    items.push({ id: 'mock_mode_active', severity: 'info', title: 'Mock mode active', message: 'Mock OBS is active for local preview.' });
  }
  if (!state?.session?.session) {
    items.push({ id: 'missing_session', severity: 'warning', title: 'Session not started', message: 'Start a session before generating final output previews.' });
  }
  if (state?.session?.localWriteBoundaryPlan?.status === 'invalid') {
    items.push({ id: 'validation_error', severity: 'error', title: 'Validation error', message: 'Local write boundary validation failed.' });
  }
  if (settingsSummary?.status === 'unavailable') {
    items.push({ id: 'storage_unavailable', severity: 'warning', title: 'Storage unavailable', message: 'Safe settings storage is unavailable in this runtime.' });
  }
  items.push({ id: 'runtime_credentials_not_saved', severity: 'info', title: 'Runtime credentials are not saved', message: 'Sensitive runtime credentials are excluded from local settings.' });
  return items;
}
