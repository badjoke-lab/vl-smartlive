function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatUtc(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function createTail(date: Date) {
  const seed = (date.getUTCMilliseconds() * 7919 + date.getUTCSeconds() * 104729) % 1679616;
  return seed.toString(36).padStart(6, "0").slice(0, 6);
}

export function createSessionId(date = new Date()) {
  return `sl_session_${formatUtc(date)}_${createTail(date)}`;
}
