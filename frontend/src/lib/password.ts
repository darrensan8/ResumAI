// Mirrors PASSWORD_RULES in backend/app/services/auth.py — keep the two lists in sync.
export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 10 characters', test: (pw) => pw.length >= 10 },
  { label: 'At least 1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'At least 1 lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'At least 1 number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'At least 1 special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export const isStrongPassword = (pw: string) => PASSWORD_RULES.every((rule) => rule.test(pw))
