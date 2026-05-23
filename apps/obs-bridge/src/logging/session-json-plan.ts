import type { SessionJsonDocument, PlannedSessionJsonWrite } from "./session-json-types";

export function planSessionJsonWrite(targetPath: string, document: SessionJsonDocument): PlannedSessionJsonWrite {
  const preview = `${JSON.stringify(document, null, 2)}\n`;
  return {
    targetPath,
    preview,
    createdAt: new Date().toISOString(),
    charLength: preview.length,
  };
}
