export function normalizeCommentText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
