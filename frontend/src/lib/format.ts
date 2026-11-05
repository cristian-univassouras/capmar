import type { User } from "./api";

export function formatDate(iso: string): string {
  // Datas civis do PostgreSQL não representam meia-noite UTC. Formato idêntico
  // no servidor e navegador evita dia anterior e falhas de hidratação.
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (civil) {
    const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    return `${civil[3]} de ${months[Number(civil[2]) - 1]} de ${civil[1]}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
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
