import { createHash } from "node:crypto";

export type ObsAuthResult =
  | { ok: true; authentication: string }
  | { ok: false; state: "unsupported_runtime"; reason: string };

export function createObsAuthResponse(input: {
  password: string;
  salt: string;
  challenge: string;
}): ObsAuthResult {
  if (!input.password || !input.salt || !input.challenge) {
    return { ok: false, state: "unsupported_runtime", reason: "missing auth input" };
  }

  if (typeof createHash !== "function") {
    return { ok: false, state: "unsupported_runtime", reason: "crypto unavailable" };
  }

  const secret = createHash("sha256")
    .update(`${input.password}${input.salt}`)
    .digest("base64");

  const authentication = createHash("sha256")
    .update(`${secret}${input.challenge}`)
    .digest("base64");

  return { ok: true, authentication };
}
