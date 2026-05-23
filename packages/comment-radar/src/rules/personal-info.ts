export const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const PHONE_PATTERN = /0\d{1,4}-?\d{1,4}-?\d{3,4}/;

export function detectPersonalInfo(text: string, hints: readonly string[]): string | undefined {
  const email = text.match(EMAIL_PATTERN)?.[0];
  if (email) return email;

  const phone = text.match(PHONE_PATTERN)?.[0];
  if (phone) return phone;

  return hints.find((hint) => text.includes(hint));
}
