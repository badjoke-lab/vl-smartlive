import type { SessionMetadata } from "./session-types";

export interface SessionDirectoryPlan {
  root: string;
  directory: string;
  files: {
    session: string;
    comments: string;
    alerts: string;
    streamState: string;
    reportJson: string;
    reportMarkdown: string;
  };
}

export function createSessionDirectoryPlan(session: Pick<SessionMetadata, "sessionId">): SessionDirectoryPlan {
  const root = "logs/sessions";
  const directory = `${root}/${session.sessionId}`;

  return {
    root,
    directory,
    files: {
      session: `${directory}/session.json`,
      comments: `${directory}/comments.jsonl`,
      alerts: `${directory}/alerts.jsonl`,
      streamState: `${directory}/stream-state.jsonl`,
      reportJson: `${directory}/report.json`,
      reportMarkdown: `${directory}/report.md`,
    },
  };
}
