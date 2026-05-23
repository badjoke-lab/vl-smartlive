import { ERROR_DISPLAY_CATALOG } from "./error-display-catalog";
import { sortErrorDisplayItems } from "./error-display-severity";

function add(items, id, overrides = {}) {
  const base = ERROR_DISPLAY_CATALOG[id];
  if (!base) return;
  items.push({ id, ...base, ...overrides });
}

export function buildErrorDisplaySummary(state, settingsSummary) {
  const items = [];
  const report = state.reportGenerationSummary || { status: "unknown", missingInputs: [] };
  const localSave = state.localSaveSummary || { status: "unknown", blockingReasons: [] };
  if (state.obsClientMode === "mock") add(items, "mock_mode_active");
  if (state.obsClientMode === "native-readonly" && state.obsDiagnostics?.runtimeSupport?.nativeReadonlyAvailable === false) add(items, "native_readonly_unavailable");
  if (state.obsDiagnostics?.connectionState === "unsupported_runtime") add(items, "unsupported_runtime", { area: "obs_diagnostics" });
  if (!state.session?.session) add(items, "missing_session");
  if (report.status === "needs_log_plans") add(items, "missing_log_plans", { cause: `Missing inputs: ${(report.missingInputs || []).join(", ") || "unknown"}` });
  if (["needs_session", "needs_log_plans"].includes(report.status)) add(items, "report_not_ready");
  if (state.session?.localWriteBoundaryPlan?.status === "invalid") add(items, "validation_error", { cause: state.session.localWriteBoundaryPlan.validationErrors.join("; ") || "Boundary validation failed." });
  if (state.session?.localPersistenceExecution?.status === "invalid_plan") add(items, "invalid_plan");
  if (state.session?.localPersistenceExecution?.status === "partial_failure") add(items, "partial_failure");
  if (localSave.status === "unsupported_runtime" || localSave.status === "boundary_blocked") add(items, "save_blocked");
  if (settingsSummary?.status === "error") add(items, "storage_unavailable");
  add(items, "password_not_saved");
  const uniq = new Map();
  for (const item of items) if (!uniq.has(item.id)) uniq.set(item.id, item);
  return sortErrorDisplayItems([...uniq.values()]);
}
