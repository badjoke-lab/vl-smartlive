import type { LocalPersistenceRuntimeSupport } from "./local-persistence-types";

export async function detectLocalPersistenceRuntimeSupport(): Promise<LocalPersistenceRuntimeSupport> {
  try {
    const runtimeLooksLikeNode = typeof process !== "undefined" && Boolean(process.versions?.node);
    if (!runtimeLooksLikeNode) return "unsupported_runtime";
    await import("node:fs/promises");
    await import("node:path");
    return "supported";
  } catch {
    return "unsupported_runtime";
  }
}
