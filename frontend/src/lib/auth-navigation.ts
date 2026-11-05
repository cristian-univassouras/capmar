/** Destinos locais explícitos, sem redirecionamento aberto para outras origens. */
export function safeAuthDestination(value: string | null): string | null {
  if (!value) return null;
  if (/^\/(usuario\/\d+|projeto\/\d+|projetos|feed|perfil|admin|chat|seguranca|equipes|equipe\/\d+)$/.test(value)) return value;
  return /^\/chat\?(conversation|team)=\d+$/.test(value) ? value : null;
}

export function currentAuthDestination(): string | null {
  return typeof window === "undefined" ? null : safeAuthDestination(new URLSearchParams(window.location.search).get("next"));
}
