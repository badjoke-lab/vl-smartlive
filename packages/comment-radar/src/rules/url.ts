export const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s]*/i;

export function detectUrl(text: string): string | undefined {
  return text.match(URL_PATTERN)?.[0];
}
