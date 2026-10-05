export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export function displayName(user: AuthUser): string {
  const name = user.name?.trim();
  return name && name.length > 0 ? name : user.email;
}

export function userHandle(user: AuthUser): string {
  const local = user.email.split("@")[0] ?? "you";
  const cleaned = local.replace(/[^A-Za-z0-9_]/g, "");
  return `@${(cleaned || "you").slice(0, 38)}`;
}
