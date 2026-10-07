export type UserProfile = { name: string; email: string; picture?: string };

export function readUser(): UserProfile | null {
  try {
    const value = JSON.parse(localStorage.getItem("user") || "null");
    return value && typeof value.name === "string" && typeof value.email === "string"
      && value.name.trim() && value.email.trim() ? value : null;
  } catch {
    return null;
  }
}
