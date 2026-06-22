export function isEmailAllowed(
  email: string,
  allowed: string | undefined,
): boolean {
  const list = (allowed ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
