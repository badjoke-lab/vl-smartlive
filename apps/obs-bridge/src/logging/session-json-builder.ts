import type { SessionDirectoryPlan } from "../session/session-paths";
import type { SessionMetadata, SessionStatus } from "../session/session-types";
import type { SessionJsonBuildResult } from "./session-json-types";

export interface BuildSessionJsonInput {
  status: SessionStatus;
  session: SessionMetadata;
  plan: SessionDirectoryPlan;
  now?: string;
}

export function buildSessionJson(input: BuildSessionJsonInput): SessionJsonBuildResult {
  const now = input.now ?? new Date().toISOString();
  const warnings: string[] = [];

  if (!input.session.sessionId) warnings.push("sessionId is empty");

  return {
    document: {
      sessionId: input.session.sessionId,
      appId: input.session.appId,
      appVersion: input.session.appVersion,
      mode: input.session.mode,
      platform: input.session.platform,
      status: input.status,
      startedAt: input.session.startedAt,
      ...(input.session.endedAt ? { endedAt: input.session.endedAt } : {}),
      ...(typeof input.session.durationSec === "number" ? { durationSec: input.session.durationSec } : {}),
      obsClientMode: input.session.obsClientMode,
      logSchemaVersion: input.session.logSchemaVersion,
      plannedFiles: { ...input.plan.files },
      createdAt: now,
      updatedAt: now,
    },
    warnings,
  };
}
