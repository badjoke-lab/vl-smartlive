export function parseJsonlLines(input: string): unknown[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${index + 1}: ${(error as Error).message}`);
      }
    });
}

export function stringifyJsonl(entries: unknown[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
}
