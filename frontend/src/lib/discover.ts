import { API_URL } from "@/lib/api";

/** Cliente do baralho do evento: identifica o aparelho e grava TUDO, com fila local e reenvio. */

export type DiscoverCard = {
  project_id: number;
  name: string;
  description: string;
  cover_url: string | null;
  logo_url: string | null;
  category: string | null;
  keywords: string[];
  owner_name: string | null;
  status: string;
  accepts_support: boolean;
  my_vote: "like" | "dislike" | null;
};
export type DiscoverDeck = { cards: DiscoverCard[]; total: number; voted: number };
export type RankingItem = { project_id: number; name: string; cover_url: string | null; category: string | null; likes: number; dislikes: number; approval: number };
export type Ranking = { people: number; items: RankingItem[] };

export type EventType =
  | "session_start" | "deck_loaded" | "tutorial_dismiss" | "card_view" | "like" | "dislike" | "drag_cancel" | "undo"
  | "details_open" | "details_close" | "project_link_click" | "deck_end" | "ranking_view" | "signup_click"
  | "page_hidden" | "page_visible" | "error";
export type Method = "swipe" | "button" | "keyboard" | "details" | "tap" | "scroll";
export type EventData = { project_id?: number; method?: Method; position?: number; dwell_ms?: number; value?: number; meta?: Record<string, unknown> };
type QueuedEvent = EventData & { id: string; type: EventType; ts: number };

const SESSION_KEY = "capmar_discover_session";
const SOURCE_KEY = "capmar_discover_source";
const QUEUE_KEY = "capmar_discover_queue";
const TUTORIAL_KEY = "capmar_discover_tutorial";
const BATCH = 100;

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

function read(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch { /* armazenamento bloqueado: segue em memória */ } }

let memorySession: string | null = null;
export function getSessionId(): string {
  const stored = read(SESSION_KEY);
  if (stored && /^[0-9a-f-]{36}$/.test(stored)) return stored;
  const id = memorySession ?? uuid();
  memorySession = id;
  write(SESSION_KEY, id);
  return id;
}

/** Origem do QR (`?e=feira`): guardada para sobreviver a recarregar a página. */
export function getSource(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("e");
  if (fromUrl && /^[A-Za-z0-9_.-]{1,40}$/.test(fromUrl)) { write(SOURCE_KEY, fromUrl); return fromUrl; }
  return read(SOURCE_KEY);
}

export const tutorialSeen = () => read(TUTORIAL_KEY) === "1";
export function markTutorialSeen() { write(TUTORIAL_KEY, "1"); window.dispatchEvent(new Event("capmar-discover-tutorial")); }
export function subscribeTutorial(listener: () => void) {
  window.addEventListener("capmar-discover-tutorial", listener);
  return () => window.removeEventListener("capmar-discover-tutorial", listener);
}

let queue: QueuedEvent[] = [];
let loaded = false;
let sending = false;
let timer: number | null = null;
let failures = 0;
let started = false;

function load() {
  if (loaded) return;
  loaded = true;
  try { const raw = read(QUEUE_KEY); if (raw) queue = JSON.parse(raw); } catch { queue = []; }
}
function persist() { write(QUEUE_KEY, JSON.stringify(queue.slice(-2000))); }

function device() {
  return {
    language: navigator.language?.slice(0, 16),
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    referrer: document.referrer ? document.referrer.slice(0, 200) : undefined,
    source: getSource() ?? undefined,
  };
}

/** Grava um evento. Votos saem na hora; o resto em lotes curtos. Nada se perde se a rede cair. */
export function track(type: EventType, data: EventData = {}) {
  if (typeof window === "undefined") return;
  load();
  queue.push({ id: uuid(), type, ts: Date.now(), ...data });
  persist();
  if (type === "like" || type === "dislike" || type === "undo") void flush();
  else schedule(1500);
}

function schedule(ms: number) {
  if (timer !== null) return;
  timer = window.setTimeout(() => { timer = null; void flush(); }, ms);
}

export async function flush(keepalive = false) {
  load();
  if (sending || queue.length === 0) return;
  sending = true;
  const batch = queue.slice(0, BATCH);
  try {
    const body = JSON.stringify({ session_id: getSessionId(), device: device(), events: batch });
    const response = await fetch(`${API_URL}/discover/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
      credentials: "include",
      keepalive: keepalive && body.length < 60000,
      body,
    });
    // 4xx (exceto limite de uso): lote inválido; descarta para não travar a fila. 429/5xx: tenta de novo.
    if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
      queue = queue.slice(batch.length);
      persist();
      failures = 0;
    } else {
      throw new Error(String(response.status));
    }
  } catch {
    failures += 1;
    schedule(Math.min(30000, 1500 * 2 ** failures));
  } finally {
    sending = false;
  }
  if (queue.length > 0 && failures === 0) void flush(keepalive);
}

/** Liga os eventos globais (sair da aba, voltar, rede, erros). Retorna a função que desfaz. */
export function startSession(): () => void {
  load();
  if (!started) { started = true; track("session_start", { meta: { path: window.location.pathname } }); }
  const onVisibility = () => {
    if (document.visibilityState === "hidden") { track("page_hidden"); void flush(true); }
    else { track("page_visible"); }
  };
  const onOnline = () => { failures = 0; void flush(); };
  const onPageHide = () => { void flush(true); };
  const onError = (event: ErrorEvent) => track("error", { meta: { message: String(event.message).slice(0, 160) } });
  const onRejection = (event: PromiseRejectionEvent) => track("error", { meta: { message: String(event.reason).slice(0, 160) } });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("online", onOnline);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  void flush();
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

export async function fetchDeck(): Promise<DiscoverDeck> {
  const response = await fetch(`${API_URL}/discover/deck?session_id=${getSessionId()}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os projetos.");
  return response.json();
}

export async function fetchRanking(limit = 10): Promise<Ranking> {
  const response = await fetch(`${API_URL}/discover/ranking?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o ranking.");
  return response.json();
}
