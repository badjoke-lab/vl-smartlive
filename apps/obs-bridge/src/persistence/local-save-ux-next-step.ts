export function getLocalSaveUxNextStep(status: string): string {
  if (status === "needs_session") return "Start session first";
  if (status === "needs_plans") return "Prepare missing plans";
  if (status === "boundary_blocked") return "Prepare local write boundary plan first";
  if (status === "unsupported_runtime") return "Run in supported desktop runtime";
  if (status === "ready_to_save") return "Save local logs";
  return "Review local save status";
}
