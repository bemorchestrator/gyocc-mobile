/**
 * Client-side mirror of the server password policy.
 *
 * Source of truth: backend/src/lib/password-policy.ts — the API enforces this
 * on every path that sets a password, and rejects anything that slips past the
 * checks here. This copy exists so the user finds out while they are typing
 * rather than after a round trip. Keep the two in step.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES_TEXT =
  `At least ${PASSWORD_MIN_LENGTH} characters. Avoid common words, your name, or your email address.`;

const COMMON_PASSWORDS = new Set([
  "password", "passw0rd", "pass", "secret", "letmein", "welcome", "admin",
  "administrator", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn", "iloveyou",
  "monkey", "dragon", "sunshine", "princess", "football", "baseball",
  "abc", "abcd", "abcdef", "abcdefg", "test", "testing", "changeme",
  "default", "user", "guest", "login", "master", "shadow", "trustno",
  "gyocc", "orchestra", "choir", "conductor", "music", "philippines",
  "gensan", "generalsantos",
]);

function coreWord(value: string): string {
  return value.toLowerCase().replace(/^[^a-z]+/, "").replace(/[^a-z]+$/, "");
}

function isTrivialSequence(value: string): boolean {
  if (/^(.)\1+$/.test(value)) return true;

  let ascending = true;
  let descending = true;
  for (let i = 1; i < value.length; i++) {
    const delta = value.charCodeAt(i) - value.charCodeAt(i - 1);
    if (delta !== 1) ascending = false;
    if (delta !== -1) descending = false;
  }
  return ascending || descending;
}

export interface PasswordContext {
  email?: string | null;
  name?: string | null;
}

/** @returns null when acceptable, otherwise a message safe to show the user. */
export function checkPasswordStrength(
  password: string,
  context: PasswordContext = {}
): string | null {
  if (!password) return "Password is required";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (password.trim().length < PASSWORD_MIN_LENGTH) {
    return "Password cannot be mostly spaces";
  }
  if (isTrivialSequence(password)) {
    return "Password is too predictable — avoid repeated or sequential characters";
  }

  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(coreWord(password)) || COMMON_PASSWORDS.has(lowered)) {
    return "Password is too common — pick something harder to guess";
  }

  const emailLocal = typeof context.email === "string" ? context.email.split("@")[0] : "";
  if (emailLocal.length >= 4 && lowered.includes(emailLocal.toLowerCase())) {
    return "Password cannot contain your email address";
  }

  const name = typeof context.name === "string" ? context.name.trim() : "";
  if (name.length >= 4 && lowered.includes(name.toLowerCase())) {
    return "Password cannot contain your name";
  }

  return null;
}
