const ORDER = { blocked: 0, error: 1, warning: 2, info: 3 };

export function sortErrorDisplayItems(items = []) {
  return [...items].sort((a, b) => {
    const bySeverity = (ORDER[a.severity] ?? 99) - (ORDER[b.severity] ?? 99);
    if (bySeverity !== 0) return bySeverity;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}
