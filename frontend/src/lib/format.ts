import type { User } from "./api";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function displayNameOf(user: { first_name?: string | null; last_name?: string | null; username?: string } | null): string {
  if (!user) return "Usuário";
  return (
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    "Usuário"
  );
}

export function initialOf(user: Pick<User, "first_name" | "username"> | null): string {
  return (user?.first_name || user?.username || "U")[0].toUpperCase();
}
