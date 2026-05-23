export const ERROR_DISPLAY_AREAS = {
  OBS_CONNECTION: "obs_connection",
  OBS_DIAGNOSTICS: "obs_diagnostics",
  SESSION: "session",
  LOG_SCAFFOLD: "log_plan",
  REPORT_GENERATION: "report_generation",
  LOCAL_WRITE_BOUNDARY: "local_write_boundary",
  LOCAL_PERSISTENCE: "local_persistence",
  SETTINGS_PERSISTENCE: "settings_persistence",
  SYSTEM: "system",
} as const;

export const ERROR_DISPLAY_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  BLOCKED: "blocked",
} as const;
