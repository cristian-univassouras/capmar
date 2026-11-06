"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronDown, Heart, Info, RotateCcw, X } from "lucide-react";

import { mediaUrl } from "@/lib/api";
import { LogoMark } from "@/app/_components/ui/Logo";
import { TileCover } from "@/app/_components/ui/primitives";
import {
  fetchDeck, fetchRanking, flush, markTutorialSeen, startSession, subscribeTutorial, track, tutorialSeen,
  type DiscoverCard, type Method, type Ranking,
} from "@/lib/discover";

type Choice = "like" | "dislike";
type Move = { card: DiscoverCard; choice: Choice };

const LIKE = "#1f6b4a";
const FLY_MS = 280;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function CardView({ card, front, elRef, busy, onVote, onOpen, onHesitate }: {
  card: DiscoverCard; front: boolean; elRef?: (el: HTMLElement | null) => void; busy: React.MutableRefObject<boolean>;
  onVote: (choice: Choice, method: Method) => void; onOpen: (method: Method) => void; onHesitate: (dx: number, dy: number) => void;
}) {
  const el = useRef<HTMLElement | null>(null);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const cover = mediaUrl(card.cover_url);

  function setRef(node: HTMLElement | null) { el.current = node; elRef?.(node); }
  function reset() {
    const node = el.current;
    if (!node) return;
    node.style.transition = "transform 240ms cubic-bezier(.2,.7,.3,1)";
    node.style.transform = "translate3d(0,0,0) rotate(0deg)";
    node.style.setProperty("--p", "0");
  }
  function down(e: React.PointerEvent<HTMLElement>) {
    if (!front || busy.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  }
  function move(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    e.currentTarget.style.transform = `translate3d(${dx}px, ${dy * 0.18}px, 0) rotate(${dx / 22}deg)`;
    e.currentTarget.style.setProperty("--p", String(clamp(dx / 110, -1, 1)));
  }
  function up(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(1, performance.now() - d.t);
    const width = e.currentTarget.offsetWidth;
    const far = Math.abs(dx) > Math.min(110, width * 0.28);
    const flick = Math.abs(dx) > 40 && Math.abs(dx) / dt > 0.6;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 600) { reset(); onOpen("tap"); return; }
    if ((far || flick) && Math.abs(dx) > Math.abs(dy)) { onVote(dx > 0 ? "like" : "dislike", "swipe"); return; }
    if (dy < -80 && Math.abs(dy) > Math.abs(dx)) { reset(); onOpen("swipe"); return; }
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) onHesitate(Math.round(dx), Math.round(dy));
    reset();
  }
  function cancel() { if (drag.current) { drag.current = null; reset(); } }

  return (
    <article
      ref={setRef}
      aria-hidden={!front}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
      style={{
        touchAction: "none", userSelect: "none", WebkitUserSelect: "none", pointerEvents: front ? "auto" : "none", cursor: front ? "grab" : "default",
        transform: front ? "none" : "scale(0.94) translateY(14px)", transition: "transform 240ms cubic-bezier(.2,.7,.3,1)",
        zIndex: front ? 2 : 1,
      }}
      className="absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_18px_40px_-22px_rgba(14,47,60,0.45)]"
    >
      <div className="relative min-h-0 flex-1 bg-surface-2">
        {cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={cover} alt={front ? `Foto do projeto ${card.name}` : ""} draggable={false} className="pointer-events-none h-full w-full object-cover" />
          : <TileCover seed={card.category ?? card.name} label={card.name} />}
        <span aria-hidden="true" style={{ opacity: "clamp(0, var(--p, 0), 1)", color: LIKE, borderColor: LIKE }} className="absolute left-5 top-5 -rotate-12 rounded-xl border-4 bg-white/85 px-3 py-1 font-heading text-2xl font-extrabold">CURTI</span>
        <span aria-hidden="true" style={{ opacity: "clamp(0, calc(var(--p, 0) * -1), 1)" }} className="absolute right-5 top-5 rotate-12 rounded-xl border-4 border-danger bg-white/85 px-3 py-1 font-heading text-2xl font-extrabold text-danger">PASSO</span>
        {front && <span aria-hidden="true" className="absolute inset-x-0 bottom-3 flex justify-center"><span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-3 py-1 text-[12px] font-semibold text-white"><ChevronDown size={14} />Toque para ver mais</span></span>}
      </div>
      <div className="px-5 pb-5 pt-4">
        {card.category && <p className="text-[13px] font-semibold text-primary">{card.category}</p>}
        <h2 className="line-clamp-2 font-heading text-[26px] font-extrabold leading-tight tracking-tight text-secondary">{card.name}</h2>
      </div>
    </article>
  );
}

function Round({ label, onClick, disabled, children, className = "", size = 60 }: {
  label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string; size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} disabled={disabled} aria-label={label} style={{ width: size, height: size }}
        className={"grid place-items-center rounded-full border-2 transition-transform active:scale-95 disabled:opacity-40 " + className}>{children}</button>
      <span className="text-[12px] font-semibold text-muted">{label}</span>
    </div>
  );
}

function EndScreen({ cards, votes, ranking, onRestart }: { cards: DiscoverCard[]; votes: Record<number, Choice>; ranking: Ranking | null; onRestart: () => void }) {
  const liked = cards.filter((c) => votes[c.project_id] === "like");
  const passed = cards.filter((c) => votes[c.project_id] === "dislike").length;
  return (
    <div className="page-enter grid gap-5 pb-6">
      <div className="ui-panel p-6 text-center">
        <p className="font-heading text-4xl font-extrabold text-secondary">Acabou!</p>
        <p className="mt-2 text-base text-muted">Você avaliou {liked.length + passed} projetos: <strong className="text-secondary">{liked.length} curtidas</strong> e {passed} passes.</p>
      </div>
      {liked.length > 0 && (
        <section className="ui-panel p-5" aria-labelledby="curtidos">
          <h2 id="curtidos" className="font-heading text-lg font-extrabold text-secondary">Projetos que você curtiu</h2>
          <ul className="mt-2 grid">
            {liked.map((c) => (
              <li key={c.project_id}>
                <Link href={`/projeto/${c.project_id}`} target="_blank" rel="noopener" onClick={() => track("project_link_click", { project_id: c.project_id, method: "tap", meta: { from: "fim" } })}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-[12px] px-2 text-[15px] font-semibold text-secondary hover:bg-primary-soft">
                  <span className="truncate">{c.name}</span><ArrowUpRight size={16} aria-hidden="true" className="shrink-0 text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="ui-panel p-5" aria-labelledby="ranking-geral">
        <h2 id="ranking-geral" className="flex items-center gap-2 font-heading text-lg font-extrabold text-secondary"><Heart size={18} className="text-accent" aria-hidden="true" />Mais curtidos do evento</h2>
        {ranking === null ? <p className="mt-3 text-sm text-muted">Carregando ranking…</p> : ranking.items.length === 0 ? <p className="mt-3 text-sm text-muted">O ranking aparece assim que houver votos.</p> : (
          <ol className="mt-2 grid">
            {ranking.items.slice(0, 5).map((item, i) => (
              <li key={item.project_id} className="flex min-h-12 items-center gap-3 px-2">
                <span aria-hidden="true" className={"grid h-7 w-7 shrink-0 place-items-center rounded-full font-heading text-[13px] font-extrabold " + (i === 0 ? "bg-sun text-secondary" : "bg-surface-2 text-secondary")}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-secondary">{item.name}</span>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-strong"><Heart size={14} aria-hidden="true" />{item.likes}</span>
              </li>
            ))}
          </ol>
        )}
        {ranking && <p className="mt-3 px-2 text-[13px] text-muted">{ranking.people} pessoas já votaram.</p>}
      </section>
      <div className="ui-panel grid gap-3 p-5">
        <p className="text-[15px] text-secondary"><strong>Seu projeto também pode estar aqui.</strong> Crie uma conta e apresente o que você faz.</p>
        <Link href="/register" onClick={() => { track("signup_click"); void flush(true); }} className="ui-button ui-button-primary">Criar minha conta<ArrowUpRight size={18} aria-hidden="true" /></Link>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onRestart} className="ui-button"><RotateCcw size={16} aria-hidden="true" />Rever tudo</button>
          <Link href="/home" className="ui-button">Ver vitrine</Link>
        </div>
      </div>
    </div>
  );
}

export default function DescobrirClient() {
  const [cards, setCards] = useState<DiscoverCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<DiscoverCard[]>([]);
  const [votes, setVotes] = useState<Record<number, Choice>>({});
  const [history, setHistory] = useState<Move[]>([]);
  const [detail, setDetail] = useState<DiscoverCard | null>(null);
  const tutorial = !useSyncExternalStore(subscribeTutorial, tutorialSeen, () => true);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [announce, setAnnounce] = useState("");

  const busy = useRef(false);
  const frontEl = useRef<HTMLElement | null>(null);
  const shownAt = useRef(0);
  const order = useRef(new Map<number, number>());
  const reduced = useRef(false);
  const opened = useRef({ at: 0, depth: 0, method: "tap" as Method });
  const endSent = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  const current = remaining[0] ?? null;
  const total = cards?.length ?? 0;
  const done = total - remaining.length;

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = startSession();
    return stop;
  }, []);

  const load = useCallback(() => {
    let active = true;
    fetchDeck().then((deck) => {
      if (!active) return;
      order.current = new Map(deck.cards.map((c, i) => [c.project_id, i]));
      setCards(deck.cards);
      setVotes(Object.fromEntries(deck.cards.filter((c) => c.my_vote).map((c) => [c.project_id, c.my_vote as Choice])));
      setRemaining(deck.cards.filter((c) => !c.my_vote));
      track("deck_loaded", { value: deck.total, meta: { already_voted: deck.voted } });
    }).catch((err) => { if (active) { setError(err instanceof Error ? err.message : "Erro ao carregar."); track("error", { meta: { message: "deck_load_failed" } }); } });
    return () => { active = false; };
  }, []);
  useEffect(() => load(), [load]);

  // Um card ficou visível: marca o instante (para medir quanto tempo a pessoa levou para decidir).
  const currentId = current?.project_id;
  useEffect(() => {
    if (currentId === undefined) return;
    shownAt.current = performance.now();
    track("card_view", { project_id: currentId, position: order.current.get(currentId) ?? 0 });
  }, [currentId]);

  // Fim do baralho: registra uma vez, busca o ranking.
  useEffect(() => {
    if (!cards || cards.length === 0 || remaining.length > 0 || endSent.current) return;
    endSent.current = true;
    track("deck_end", { value: cards.length, meta: { likes: Object.values(votes).filter((v) => v === "like").length } });
    fetchRanking().then((r) => { setRanking(r); track("ranking_view"); }).catch(() => setRanking({ people: 0, items: [] }));
  }, [cards, remaining.length, votes]);

  const position = (card: DiscoverCard) => order.current.get(card.project_id) ?? 0;

  const closeDetail = useCallback((via: string) => {
    if (!detail) return;
    track("details_close", { project_id: detail.project_id, dwell_ms: Math.round(performance.now() - opened.current.at), value: Math.round(opened.current.depth), meta: { via } });
    setDetail(null);
  }, [detail]);

  const openDetail = useCallback((method: Method) => {
    if (!current || busy.current || detail || tutorial) return;
    opened.current = { at: performance.now(), depth: 0, method };
    track("details_open", { project_id: current.project_id, method, position: position(current) });
    setDetail(current);
  }, [current, detail, tutorial]);

  const vote = useCallback((choice: Choice, method: Method) => {
    if (!current || busy.current || tutorial) return;
    busy.current = true;
    const dwell = Math.round(performance.now() - shownAt.current);
    const viaDetails = detail !== null;
    if (viaDetails) closeDetail("voto");
    // Gravado no instante da decisão, antes de qualquer animação.
    track(choice, { project_id: current.project_id, method: viaDetails ? "details" : method, position: position(current), dwell_ms: dwell });
    setVotes((v) => ({ ...v, [current.project_id]: choice }));
    setHistory((h) => [...h, { card: current, choice }]);
    setAnnounce(choice === "like" ? `Você curtiu ${current.name}` : `Você passou ${current.name}`);
    const node = frontEl.current;
    const finish = () => { setRemaining((r) => r.slice(1)); busy.current = false; };
    if (node && !reduced.current) {
      const dir = choice === "like" ? 1 : -1;
      node.style.setProperty("--p", String(dir));
      node.style.transition = `transform ${FLY_MS}ms cubic-bezier(.2,.7,.3,1), opacity ${FLY_MS}ms ease-out`;
      node.style.transform = `translate3d(${dir * window.innerWidth * 1.1}px, -30px, 0) rotate(${dir * 20}deg)`;
      node.style.opacity = "0";
      window.setTimeout(finish, FLY_MS);
    } else finish();
  }, [current, detail, tutorial, closeDetail]);

  const undo = useCallback(() => {
    if (busy.current || history.length === 0 || tutorial) return;
    const last = history[history.length - 1];
    track("undo", { project_id: last.card.project_id, method: "button", meta: { previous: last.choice } });
    setHistory((h) => h.slice(0, -1));
    setVotes((v) => { const next = { ...v }; delete next[last.card.project_id]; return next; });
    setRemaining((r) => [last.card, ...r]);
    endSent.current = false;
    setRanking(null);
    setAnnounce(`Voto em ${last.card.name} desfeito`);
  }, [history, tutorial]);

  const restart = useCallback(() => {
    if (!cards) return;
    endSent.current = false;
    setRanking(null);
    setHistory([]);
    setRemaining(cards);
  }, [cards]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || target?.closest("input, textarea, select")) return;
      if (e.key === "Escape") { if (detail) closeDetail("fechar"); return; }
      if (tutorial) return;
      if (e.key === "ArrowRight") { e.preventDefault(); vote("like", "keyboard"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); vote("dislike", "keyboard"); }
      else if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") { if (!detail && target?.tagName !== "BUTTON" && target?.tagName !== "A") { e.preventDefault(); openDetail("keyboard"); } }
      else if (e.key.toLowerCase() === "z") undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vote, undo, openDetail, closeDetail, detail, tutorial]);

  useEffect(() => {
    if (!detail) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, [detail]);

  function dismissTutorial() {
    markTutorialSeen();
    track("tutorial_dismiss");
    shownAt.current = performance.now();
  }

  const finished = cards !== null && cards.length > 0 && remaining.length === 0;
  const likes = Object.values(votes).filter((v) => v === "like").length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-6 pt-4 sm:pt-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/home" aria-label="CapMar, vitrine de projetos" className="inline-flex min-h-11 items-center gap-2"><LogoMark size={32} /><span className="font-heading text-lg font-extrabold tracking-tight text-secondary">Descobrir</span></Link>
        {cards && cards.length > 0 && <p className="text-[14px] font-semibold text-muted" aria-label={`${done} de ${total} avaliados`}>{Math.min(done + (finished ? 0 : 1), total)} de {total}</p>}
      </header>
      {cards && cards.length > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progresso do baralho"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>}

      {error ? (
        <div role="alert" className="ui-panel mt-8 grid gap-3 p-6 text-center">
          <p className="font-semibold text-secondary">{error}</p>
          <button type="button" className="ui-button ui-button-primary mx-auto" onClick={() => { setError(null); load(); }}>Tentar de novo</button>
        </div>
      ) : cards === null ? (
        <div className="mt-6 flex-1 animate-pulse rounded-[24px] bg-surface-2" role="status" aria-label="Carregando projetos" style={{ minHeight: 420 }} />
      ) : cards.length === 0 ? (
        <div className="ui-panel mt-8 p-6 text-center"><p className="font-heading text-xl font-extrabold text-secondary">Ainda não há projetos para avaliar</p><p className="mt-2 text-muted">Volte em instantes.</p></div>
      ) : finished ? (
        <div className="mt-6"><EndScreen cards={cards} votes={votes} ranking={ranking} onRestart={restart} /></div>
      ) : (
        <>
          <div className="relative my-4 min-h-[420px] flex-1" onWheel={(e) => { if (e.deltaY > 25) openDetail("scroll"); }}>
            {remaining.slice(0, 2).map((card) => (
              <CardView key={card.project_id} card={card} front={card.project_id === current?.project_id} busy={busy}
                elRef={card.project_id === current?.project_id ? (el) => { frontEl.current = el; } : undefined}
                onVote={vote} onOpen={openDetail}
                onHesitate={(dx, dy) => track("drag_cancel", { project_id: card.project_id, position: position(card), meta: { dx, dy } })} />
            ))}
          </div>
          <div className="grid grid-cols-4 items-start gap-2 px-1">
            <Round label="Desfazer" onClick={undo} disabled={history.length === 0} size={48} className="mt-2 border-line bg-surface text-secondary"><RotateCcw size={20} aria-hidden="true" /></Round>
            <Round label="Passar" onClick={() => vote("dislike", "button")} className="border-danger bg-surface text-danger"><X size={30} aria-hidden="true" /></Round>
            <Round label="Detalhes" onClick={() => openDetail("button")} size={48} className="mt-2 border-line bg-surface text-primary"><Info size={22} aria-hidden="true" /></Round>
            <Round label="Curtir" onClick={() => vote("like", "button")} className="border-transparent text-white" ><span className="grid h-full w-full place-items-center rounded-full" style={{ background: LIKE }}><Heart size={28} aria-hidden="true" /></span></Round>
          </div>
          <p className="mt-4 text-center text-[13px] text-muted"><span className="hidden sm:inline">Setas do teclado: ← passa, → curte, ↓ detalhes. </span>Arraste para a direita para curtir e para a esquerda para passar.</p>
          <p className="mt-1 text-center text-[13px] text-muted">{likes} curtidas até agora</p>
        </>
      )}
      <p className="sr-only" aria-live="polite">{announce}</p>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-secondary/55 sm:items-center sm:p-6" onClick={() => closeDetail("fora")}>
          <div role="dialog" aria-modal="true" aria-label={`Detalhes de ${detail.name}`} onClick={(e) => e.stopPropagation()}
            className="page-enter flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[24px] bg-surface sm:rounded-[24px]">
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
              <div className="min-w-0">
                {detail.category && <p className="text-[13px] font-semibold text-primary">{detail.category}</p>}
                <h2 className="font-heading text-2xl font-extrabold leading-tight text-secondary">{detail.name}</h2>
              </div>
              <button ref={closeButton} type="button" onClick={() => closeDetail("fechar")} aria-label="Fechar detalhes" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface-2"><X size={22} aria-hidden="true" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" onScroll={(e) => {
              const n = e.currentTarget; const span = n.scrollHeight - n.clientHeight;
              if (span > 0) opened.current.depth = Math.max(opened.current.depth, (n.scrollTop / span) * 100);
            }}>
              {mediaUrl(detail.cover_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(detail.cover_url)} alt={`Foto do projeto ${detail.name}`} className="mb-4 max-h-64 w-full rounded-[16px] object-cover" />
              )}
              {detail.owner_name && <p className="text-[14px] text-muted">Por <strong className="text-secondary">{detail.owner_name}</strong></p>}
              <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-relaxed text-foreground">{detail.description || "Este projeto ainda não tem descrição."}</p>
              {detail.keywords.length > 0 && <ul className="mt-4 flex flex-wrap gap-2" aria-label="Palavras-chave">{detail.keywords.map((k) => <li key={k} className="ui-badge">{k}</li>)}</ul>}
              {detail.accepts_support && <p className="mt-4"><span className="ui-badge is-public">Aceita apoio</span></p>}
              <Link href={`/projeto/${detail.project_id}`} target="_blank" rel="noopener" onClick={() => track("project_link_click", { project_id: detail.project_id, method: "tap", meta: { from: "detalhes" } })}
                className="ui-button mt-5">Ver página completa<ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line bg-surface px-5 py-3">
              <button type="button" onClick={() => vote("dislike", "button")} className="ui-button ui-button-danger"><X size={18} aria-hidden="true" />Passar</button>
              <button type="button" onClick={() => vote("like", "button")} className="ui-button text-white" style={{ background: LIKE, borderColor: LIKE }}><Heart size={18} aria-hidden="true" />Curtir</button>
            </div>
          </div>
        </div>
      )}

      {tutorial && cards && cards.length > 0 && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-secondary/70 p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo" className="page-enter w-full max-w-sm rounded-[24px] bg-surface p-6">
            <h2 id="tutorial-titulo" className="font-heading text-2xl font-extrabold text-secondary">Como funciona</h2>
            <ul className="mt-4 grid gap-3 text-[15px] text-foreground">
              <li><strong style={{ color: LIKE }}>Arraste para a direita</strong> para curtir.</li>
              <li><strong className="text-danger">Arraste para a esquerda</strong> para passar.</li>
              <li><strong>Toque no cartão</strong> ou role para baixo para ver os detalhes.</li>
            </ul>
            <p className="mt-4 rounded-[12px] bg-surface-2 p-3 text-[13px] text-muted">Para a pesquisa do evento, registramos de forma anônima o que você faz aqui (votos, tempo e tipo de aparelho). Não pedimos nome nem contato.</p>
            <button type="button" autoFocus onClick={dismissTutorial} className="ui-button ui-button-primary mt-5 w-full">Entendi, vamos lá</button>
          </div>
        </div>
      )}
    </main>
  );
}
