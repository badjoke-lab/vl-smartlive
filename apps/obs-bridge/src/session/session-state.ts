import { createSessionId } from "./session-id";
import { createSessionDirectoryPlan } from "./session-paths";
import type { SessionMetadata, SessionState } from "./session-types";

export interface CreateSessionDraftInput {
  appId: string;
  appVersion: string;
  mode: string;
  platform: string;
  obsClientMode: string;
  logSchemaVersion: string;
  notes?: string;
  startedAt?: string;
}

export function createSessionDraft(input: CreateSessionDraftInput): SessionMetadata {
  const startedAt = input.startedAt ?? new Date().toISOString();

  return {
    sessionId: createSessionId(new Date(startedAt)),
    appId: input.appId,
    appVersion: input.appVersion,
    mode: input.mode,
    platform: input.platform,
    startedAt,
    obsClientMode: input.obsClientMode,
    logSchemaVersion: input.logSchemaVersion,
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

export function startSession(previousState: SessionState, input: CreateSessionDraftInput): SessionState {
  const session = createSessionDraft(input);
  const plan = createSessionDirectoryPlan(session);
  return {
    ...previousState,
    status: "active",
    session,
    plannedLogDirectory: plan.directory,
  };
}

export function endSession(previousState: SessionState, endedAt = new Date().toISOString()): SessionState {
  if (!previousState.session) {
    return { ...previousState, status: "error" };
  }

  const startAtMs = Date.parse(previousState.session.startedAt);
  const endAtMs = Date.parse(endedAt);
  const durationSec = Number.isNaN(startAtMs) || Number.isNaN(endAtMs)
    ? undefined
    : Math.max(0, Math.floor((endAtMs - startAtMs) / 1000));

  return {
    ...previousState,
    status: "ended",
    session: {
      ...previousState.session,
      endedAt,
      ...(durationSec === undefined ? {} : { durationSec }),
    },
  };
}
