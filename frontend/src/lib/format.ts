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

export const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "concluido", label: "Concluído" },
] as const;

/** Rótulo em português do status gravado no backend (rascunho, ativo, pausado, concluido). */
export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** Classe do selo `ui-badge` para o status. */
export function statusBadgeClass(status: string): string {
  return status === "rascunho" ? "ui-badge is-draft" : status === "ativo" ? "ui-badge is-public" : "ui-badge";
}

/** Azulejo (tile-a..e) estável derivado de um texto, para capas e avatares sem imagem. */
export function tileClassFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return "tile-" + "abcde"[h % 5];
}

/** Iniciais (até 2 letras) de um nome, para avatares de equipe. Ignora o prefixo genérico "Equipe", "Time" ou "Grupo". */
export function initialsOf(name: string): string {
  const all = name.trim().split(/\s+/).map((word) => word.replace(/^[^\p{L}\p{N}]+/u, "")).filter(Boolean);
  const words = all.length > 1 && /^(equipe|time|grupo)$/i.test(all[0]) ? all.slice(1) : all;
  if (words.length === 0) return "?";
  return (words.length === 1 ? Array.from(words[0]).slice(0, 2).join("") : words[0][0] + words[1][0]).toUpperCase();
}
