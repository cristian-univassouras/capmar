"use client";
import ProfileLink from "@/app/_components/ProfileLink";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, getMe, getJson, type Author, type User } from "@/lib/api";
import { createDirectConversation, getConversation, getTeamConversation, getConversations, getMessages, sendMessage, type Conversation, type Message } from "@/lib/engagement";

import { Avatar } from "@/app/_components/media";
import { ListSkeleton } from "@/app/_components/ui/primitives";
import { displayNameOf } from "@/lib/format";
import { ArrowLeft, Send, MoreHorizontal, Search, SquarePen, MessagesSquare, X, Users } from "lucide-react";

type Outgoing = { clientId: string; content: string; createdAt: string; failed: boolean };

function mergeMessages(old: Message[], incoming: Message[]) {
  return [...new Map([...old, ...incoming].map((m) => [m.message_id, m])).values()].sort((a, b) => a.message_id - b.message_id);
}

/** Conversa de equipe mostra um ícone suave de equipe; conversa direta mostra a foto da outra pessoa. */
function ConversationAvatar({ conversation, me, className }: { conversation: Conversation; me: User | null; className: string }) {
  if (conversation.kind === "team") {
    return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal ${className}`}><Users size={18} /></span>;
  }
  return <Avatar user={conversation.participants.find((u) => u.user_id !== me?.user_id) ?? null} className={className} />;
}

function dayKey(iso: string) { const d = new Date(iso); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
function dayLabel(iso: string) {
  const d = new Date(iso); const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Hoje";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}
function DaySeparator({ iso }: { iso: string }) {
  const label = dayLabel(iso);
  return <li role="separator" aria-label={label} className="my-4 flex items-center gap-3 text-[13px] font-semibold text-muted first:mt-0"><span aria-hidden="true" className="h-px flex-1 bg-line" /><span className="capitalize">{label}</span><span aria-hidden="true" className="h-px flex-1 bg-line" /></li>;
}

function Room({ conversation, me }: { conversation: Conversation; me: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const [status, setStatus] = useState("Conectando...");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [more, setMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [retry, setRetry] = useState(0);
  const [menu, setMenu] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const last = useRef(0);
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 500;
    function connect() {
      if (disposed) return;
      const url = new URL(API_URL); url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/chat/ws/" + conversation.conversation_id; url.search = "?after=" + last.current;
      socket = new WebSocket(url);
      socket.onopen = () => { if (!disposed) { setStatus("Conectado"); setError(""); delay = 500; } };
      socket.onmessage = (event) => {
        if (disposed) return;
        const data = JSON.parse(event.data) as { type: string; items: Message[] };
        if (data.type === "messages" && data.items.length) {
          last.current = Math.max(last.current, data.items[data.items.length - 1].message_id);
          setMessages((old) => mergeMessages(old, data.items));
        }
      };
      socket.onclose = (event) => {
        if (disposed) return;
        if ([4401, 4403, 1008].includes(event.code)) { setMessages([]); setStatus("Sessão ou acesso encerrado. Entre novamente."); return; }
        setStatus("Reconectando... As mensagens enviadas estão salvas.");
        timer = setTimeout(() => { getMe().then(() => connect()).catch(() => { if (!disposed) { setMessages([]); setStatus("Sessão expirada ou servidor indisponível. Tente reconectar."); } }); }, delay); delay = Math.min(delay * 2, 15000);
      };
    }
    getMessages(conversation.conversation_id).then((items) => {
      if (disposed) return;
      setMessages(items); setMore(items.length === 50); last.current = items.at(-1)?.message_id ?? 0;
      connect();
    }).catch((e) => { if (!disposed) { setError(e.message); setStatus("Não foi possível conectar"); } });
    return () => { disposed = true; clearTimeout(timer); socket?.close(); };
  }, [conversation.conversation_id, retry]);

  // Menu "Opções": fecha com Esc (devolvendo o foco ao botão) e ao clicar fora.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); menuButton.current?.focus(); } };
    const onPointer = (e: PointerEvent) => { if (!menuRoot.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [menu]);

  /** Envia com o mesmo client_id: o servidor deduplica reenvios e o socket pode entregar a mensagem antes da resposta. */
  async function deliver(clientId: string, content: string) {
    setError("");
    setOutbox((items) => items.map((o) => (o.clientId === clientId ? { ...o, failed: false } : o)));
    try {
      const message = await sendMessage(conversation.conversation_id, content, clientId);
      setMessages((items) => mergeMessages(items, [message]));
      setOutbox((items) => items.filter((o) => o.clientId !== clientId));
      // O cursor do socket só avança pelo fluxo recebido para não pular mensagens de outro participante.
    } catch {
      setOutbox((items) => items.map((o) => (o.clientId === clientId ? { ...o, failed: true } : o)));
      setError("Não foi possível enviar a mensagem. Use “Tentar de novo” na mensagem marcada.");
    }
  }
  function send(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim(); if (!content) return;
    const clientId = crypto.randomUUID();
    setOutbox((items) => [...items, { clientId, content, createdAt: new Date().toISOString(), failed: false }]);
    setText("");
    void deliver(clientId, content);
  }

  const scroll = useRef<HTMLOListElement>(null);
  const tail = useRef<string>("");
  const shownOutbox = outbox.filter((o) => !messages.some((m) => m.client_id === o.clientId));
  useEffect(() => {
    const id = (messages.at(-1)?.message_id ?? 0) + ":" + shownOutbox.length;
    if (tail.current !== id) { tail.current = id; if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }
  });
  const other = conversation.participants.find((u) => u.user_id !== me.user_id);
  const nameOf = (id: number) => conversation.participants.find((u) => u.user_id === id);
  const items: { key: string; iso: string; node: React.ReactNode }[] = [
    ...messages.map((m) => ({
      key: "m" + m.message_id, iso: m.created_at,
      node: <li className={"chat-bubble " + (m.sender_id === me.user_id ? "is-mine" : "")}><div className="chat-bubble-meta"><ProfileLink user={nameOf(m.sender_id)} userId={m.sender_id} className="-my-3.5 inline-block py-3.5">{nameOf(m.sender_id)?.username ?? "Participante"}</ProfileLink><time dateTime={m.created_at} title={new Date(m.created_at).toLocaleString("pt-BR")}>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div><p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.content}</p></li>,
    })),
    ...shownOutbox.map((o) => ({
      key: "o" + o.clientId, iso: o.createdAt,
      node: <li className={"chat-bubble is-mine"}><div className="chat-bubble-meta"><span>{o.failed ? "Não enviada" : "Enviando…"}</span></div><p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{o.content}</p>{o.failed && <button type="button" onClick={() => void deliver(o.clientId, o.content)} className="-mb-2 mt-1 min-h-11 rounded-lg px-1 text-[13px] font-semibold text-white underline underline-offset-2">Tentar de novo</button>}</li>,
    })),
  ];

  return <section aria-label="Conversa" className="chat-room">
    <header className="chat-room-header">
      <Link href="/chat" aria-label="Voltar para conversas" className="ui-icon-button lg:hidden"><ArrowLeft size={20} /></Link>
      <ConversationAvatar conversation={conversation} me={me} className="h-10 w-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 aria-label={conversation.title} className="truncate font-heading text-lg font-bold text-secondary">{conversation.kind === "direct" ? <ProfileLink user={other}>{conversation.title}</ProfileLink> : conversation.title}</h2>
        <p role="status" className="mt-1 flex items-center gap-2 text-[13px] text-muted"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: status === "Conectado" ? "var(--tertiary)" : "var(--sun)" }} />{status}</p>
      </div>
      <div className="chat-options" ref={menuRoot}>
        <button ref={menuButton} type="button" aria-label="Opções da conversa" aria-expanded={menu} aria-controls={"menu-" + conversation.conversation_id} onClick={() => setMenu((v) => !v)} className="ui-icon-button"><MoreHorizontal size={21} /></button>
        {menu && <div id={"menu-" + conversation.conversation_id}>
          <button type="button" onClick={() => { setRetry((n) => n + 1); setMenu(false); }}>Reconectar</button>
          <p className="px-2.5 pb-1 pt-3 text-[13px] font-semibold text-muted">Participantes ({conversation.participants.length})</p>
          {conversation.participants.map((u) => <ProfileLink key={u.user_id} user={u}>@{u.username}</ProfileLink>)}
        </div>}
      </div>
    </header>
    {status !== "Conectado" && status !== "Conectando..." && <div className="chat-connection"><button type="button" className="min-h-11 font-semibold underline" onClick={() => setRetry((n) => n + 1)}>Tentar reconectar</button>{/Sessão|acesso encerrado/i.test(status) && <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">Entrar novamente</Link>}</div>}
    {more && messages.length > 0 && <div className="chat-history"><button type="button" style={{ minHeight: 44 }} disabled={loadingHistory} onClick={async () => { setLoadingHistory(true); try { const older = await getMessages(conversation.conversation_id, messages[0].message_id); setMessages((prev) => mergeMessages(prev, older)); setMore(older.length === 50); } catch (e) { setError(e instanceof Error ? e.message : "Erro no histórico"); } finally { setLoadingHistory(false); } }}>{loadingHistory ? "Carregando..." : "Carregar mensagens anteriores"}</button></div>}

    <ol ref={scroll} aria-label="Mensagens" aria-live="polite" className="chat-messages">
      {items.map((item, i) => <Fragment key={item.key}>{(i === 0 || dayKey(items[i - 1].iso) !== dayKey(item.iso)) && <DaySeparator iso={item.iso} />}{item.node}</Fragment>)}
      {!items.length && <li className="chat-empty-messages"><MessagesSquare size={28} /><p>A conversa começa por aqui.</p><span>{conversation.kind === "team" ? "Combinem os próximos passos do projeto." : "Envie uma mensagem para se apresentar."}</span></li>}
    </ol>
    {error && <p role="alert" className="ui-error mx-4 mb-2">{error}</p>}
    {conversation.kind === "legacy" ? <p className="ui-notice m-4">Este histórico é somente para leitura. Abra o perfil da pessoa para começar uma nova conversa.</p> : <form onSubmit={send} className="chat-composer"><label className="min-w-0 flex-1"><span className="sr-only">Mensagem</span><textarea aria-label="Mensagem" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} maxLength={2000} required rows={2} placeholder="Escreva sua mensagem…" /></label><button disabled={!text.trim()} aria-label="Enviar mensagem" className="chat-send"><Send size={20} /></button><p className="chat-composer-hint">Enter para enviar · Shift + Enter para uma nova linha</p></form>}
  </section>;
}

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cid = params.get("conversation");
  const teamId = params.get("team");
  const [me, setMe] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const key = [cid, teamId, revision].join(":");
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [people, setPeople] = useState<Author[]>([]);
  const [peopleError, setPeopleError] = useState("");
  const [searched, setSearched] = useState(false);
  const [finding, setFinding] = useState(false);
  function openDialog() { opener.current = document.activeElement as HTMLElement | null; setPeople([]); setSearched(false); setPeopleError(""); dialog.current?.showModal(); }
  async function findPeople(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const q = String(new FormData(e.currentTarget).get("person") ?? "").trim().replace(/^@/, ""); if (q.length < 2) { setPeopleError("Digite pelo menos 2 caracteres para buscar."); return; } setFinding(true); setPeopleError(""); try { setPeople((await getJson<Author[]>("/users?q=" + encodeURIComponent(q) + "&limit=20")).filter(u => u.user_id !== me?.user_id)); setSearched(true); } catch (e) { setPeopleError(e instanceof Error ? e.message : "Não foi possível buscar pessoas."); } finally { setFinding(false); } }
  async function start(person: Author) { setFinding(true); setPeopleError(""); try { const room = await createDirectConversation(person.user_id); dialog.current?.close(); router.replace("/chat?conversation=" + room.conversation_id); } catch (e) { setPeopleError(e instanceof Error ? e.message : "Não foi possível abrir a conversa."); } finally { setFinding(false); } }

  useEffect(() => {
    let active = true;
    const room = cid ? getConversation(Number(cid)) : teamId ? getTeamConversation(Number(teamId)) : Promise.resolve(null);
    Promise.all([getMe(), getConversations(), room]).then(([user, items, chosen]) => {
      if (active) { setMe(user); setConversations(items); setSelected(chosen); setMore(items.length === 30); setError(""); }
    }).catch((e) => { if (active) { setSelected(null); setConversations([]); setError(e.message); } })
      .finally(() => { if (active) setLoaded(key); });
    return () => { active = false; };
  }, [cid, teamId, revision, key]);
  async function older() {
    setBusy(true); setError("");
    try {
      const items = await getConversations(conversations.at(-1)!.conversation_id);
      setConversations((old) => [...new Map([...old, ...items].map((c) => [c.conversation_id, c])).values()]); setMore(items.length === 30);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar"); }
    finally { setBusy(false); }
  }
  const sections = (["direct", "team", "legacy"] as const).map((kind) => ({ kind, all: conversations.filter(c => c.kind === kind) }));
  const nothing = !conversations.length;
  return <div className="chat-page"><div className="ui-page-heading"><div><h1>Conversas</h1><p>Pessoas e equipes, mais perto das suas ideias.</p></div><button onClick={openDialog} className="ui-button ui-button-primary"><SquarePen size={17} />Nova mensagem</button></div>
    {error && <p role="alert" className="ui-error">{error}</p>}
    {loaded !== key ? <ListSkeleton rows={4} label="Carregando conversas" /> : <div className="chat-workspace"><aside className={"chat-sidebar " + (selected ? "has-selection" : "")}><div className="chat-sidebar-tools"><label><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Buscar nesta lista" placeholder="Buscar nesta lista" /></label><button onClick={() => setRevision(n => n + 1)} className="chat-refresh" style={{ minHeight: 44 }}>Atualizar conversas</button></div><div className="chat-conversation-list">
      {nothing && !error && <div className="grid justify-items-start gap-3 px-3 py-6"><p className="text-[15px] text-muted">Você ainda não tem conversas. Busque alguém da comunidade para começar.</p><button onClick={openDialog} className="ui-button">Encontrar uma pessoa</button></div>}
      {!nothing && sections.map(({ kind, all }) => { const items = all.filter(c => c.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))); if (kind === "legacy" && !all.length) return null; const heading = kind === "direct" ? "Mensagens diretas" : kind === "team" ? "Equipes" : "Históricos anteriores"; return <section key={kind} aria-label={heading}><h2>{heading}</h2>{items.map(c => <button key={c.conversation_id} aria-label={c.title} aria-current={selected?.conversation_id === c.conversation_id ? "true" : undefined} onClick={() => router.replace("/chat?conversation=" + c.conversation_id)} className={"chat-conversation " + (selected?.conversation_id === c.conversation_id ? "is-selected" : "")}><ConversationAvatar conversation={c} me={me} className="h-10 w-10 shrink-0" /><span className="min-w-0"><strong>{c.title}</strong><span>{kind === "team" ? "Conversa da equipe" : kind === "legacy" ? "Somente leitura" : "Mensagem direta"}</span></span></button>)}{!items.length && <p className="px-4 py-3 text-[13px] text-muted">{query ? "Nenhuma conversa nesta lista." : "Nenhuma conversa por enquanto."}</p>}</section>; })}
      {more && <button disabled={busy} onClick={older} className="chat-load-more">{busy ? "Carregando..." : "Carregar conversas anteriores"}</button>}</div></aside>{selected && me ? <Room key={selected.conversation_id} conversation={selected} me={me} /> : <div className="chat-welcome"><span><MessagesSquare size={35} /></span><h2>Uma boa ideia começa com uma conversa.</h2><p>Escolha uma pessoa ou equipe na lista, ou comece uma nova mensagem.</p><button onClick={openDialog} className="ui-button">Encontrar uma pessoa</button></div>}</div>}
    <dialog ref={dialog} aria-labelledby="new-message-title" aria-modal="true" onClose={() => opener.current?.focus?.()} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }} className="ui-dialog new-message-dialog"><div className="flex items-center justify-between gap-4"><h2 id="new-message-title" className="font-heading text-xl font-bold text-secondary">Nova mensagem</h2><button type="button" aria-label="Fechar nova mensagem" onClick={() => dialog.current?.close()} className="ui-icon-button"><X size={20} /></button></div><p className="mt-2 text-[15px] text-muted">Encontre alguém da comunidade para conversar.</p><form onSubmit={findPeople} className="mt-5 flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Nome ou usuário</span><input name="person" minLength={2} maxLength={100} required autoFocus placeholder="Nome ou @usuário" className="ui-input" /></label><button disabled={finding} className="ui-button ui-button-primary">Buscar</button></form>{peopleError && <p role="alert" className="ui-error mt-4">{peopleError}</p>}<ul className="mt-4 space-y-1">{people.map(person => <li key={person.user_id}><button disabled={finding} onClick={() => start(person)} className="flex min-h-14 w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-primary/5"><Avatar user={person} className="h-10 w-10" /><span><strong className="block text-[15px]">{displayNameOf(person)}</strong><span className="text-[13px] text-muted">@{person.username}</span></span></button></li>)}</ul>{searched && !people.length && <p className="mt-4 text-[15px] text-muted">Nenhuma pessoa encontrada. Tente outro nome.</p>}</dialog>
  </div>;
}

export default function ChatPage() {
  return <Suspense fallback={<ListSkeleton rows={4} label="Carregando conversas" />}><ChatContent /></Suspense>;
}
