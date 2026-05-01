export const PASSWORD_MIN_LENGTH = 8;

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export type PasswordChecklist = {
  minLen: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  symbol: boolean;
};

export function evaluatePassword(password: string): {
  checklist: PasswordChecklist;
  strength: PasswordStrength;
  meetsBaseline: boolean;
} {
  const minLen = password.length >= PASSWORD_MIN_LENGTH;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const digit = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (minLen) score += 1;
  if (upper) score += 1;
  if (lower) score += 1;
  if (digit) score += 1;
  if (symbol) score += 1;
  if (password.length >= 12) score += 1;

  let strength: PasswordStrength = "weak";
  if (score >= 6) strength = "strong";
  else if (score >= 5) strength = "good";
  else if (score >= 3) strength = "fair";

  const meetsBaseline = minLen && lower && upper && digit && symbol;

  return {
    checklist: { minLen, upper, lower, digit, symbol },
    strength,
    meetsBaseline
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const s = email.trim();
  if (!s || s.length > 254) return false;
  return EMAIL_RE.test(s);
}
