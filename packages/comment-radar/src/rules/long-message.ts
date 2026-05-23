export function isLongMessage(text: string, threshold = 120): boolean {
  return [...text].length >= threshold;
}
