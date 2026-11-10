// Client-side checks that mirror AccountInput and TherapistInput in the Kotlin API. The API stays the source of truth.

export const EMAIL = /^\S+@\S+\.\S+$/;
export const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72; // BCrypt ignores anything past 72 bytes.
const CRP = /^(?:CRP)?(\d{2})\/?(\d{3,6})$/;

export const digits = (value: string) => value.replace(/\D/g, "");

export const isPhone = (value: string) => [10, 11].includes(digits(value).length);
export const isPasswordTooLong = (value: string) => new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES;

/** "CRP 06/123456", "06/123456" or "06123456", with a region between 01 and 24. */
export function isCrp(value: string): boolean {
  const match = CRP.exec(value.toUpperCase().replace(/[^A-Z0-9/]/g, ""));
  return match !== null && Number(match[1]) >= 1 && Number(match[1]) <= 24;
}

/** "150" or "150,00" → 15000 cents; empty → undefined; anything else → NaN. */
export function priceToCents(value: string): number | undefined {
  const clean = value.trim().replace(/^R\$\s*/i, "").replace(/\./g, "").replace(",", ".");
  if (!clean) return undefined;
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(Number(clean) * 100) : NaN;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Only same-site paths, so ?next= can't send someone to another website after login. */
export function safeNext(next: string | undefined, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
