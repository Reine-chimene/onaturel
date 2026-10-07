/** Domaine des comptes admin (suffixe si l’utilisateur ne saisit pas @). */
export function loginEmailDomain(): string {
  return (process.env.LOGIN_EMAIL_DOMAIN ?? "onaturelle.com").toLowerCase();
}

const ALIAS_LOCAL_PARTS: Record<string, string> = {
  onqture: "onqture",
  owner: "onqture",
};

export function normalizeLoginEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (value.includes("@")) return value;
  const local = ALIAS_LOCAL_PARTS[value] ?? value;
  return `${local}@${loginEmailDomain()}`;
}
