export type PasswordStrength = "weak" | "fair" | "strong"

// A rough guide for the meter only; the real rule is the minimum length the API enforces.
export function passwordStrength(password: string): PasswordStrength {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length

  if (password.length >= 14 && classes >= 2) return "strong"

  if (password.length >= 10) return classes >= 3 ? "strong" : "fair"

  return "weak"
}
