"use client";
import ProfileLink from "@/app/_components/ProfileLink";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, getMe, type User } from "@/lib/api";
import { getConversation, getTeamConversation, getConversations, getMessages, sendMessage, type Conversation, type Message } from "@/lib/engagement";

function mergeMessages(old: Message[], incoming: Message[]) {
  return [...new Map([...old, ...incoming].map((m) => [m.message_id, m])).values()].sort((a, b) => a.message_id - b.message_id);
}

function Room({ conversation, me }: { conversation: Conversation; me: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Conectando...");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [more, setMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [retry, setRetry] = useState(0);
  const pending = useRef<{ content: string; id: string } | null>(null);
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
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!text.trim() || sending) return;
    const content = text.trim();
    if (pending.current?.content !== content) pending.current = { content, id: crypto.randomUUID() };
    setSending(true); setError("");
    try {
      const message = await sendMessage(conversation.conversation_id, content, pending.current.id);
      setMessages((items) => mergeMessages(items, [message])); setText(""); pending.current = null;
      // O cursor do socket só avança pelo fluxo recebido para não pular mensagens de outro participante.
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao enviar. Tente novamente."); }
    finally { setSending(false); }
  }
  return <section aria-label="Conversa" className="min-w-0 space-y-4 rounded-2xl bg-white p-4 sm:p-5">
    <h2 aria-label={conversation.title} className="break-words text-2xl font-bold">{conversation.kind === "direct" ? <ProfileLink user={conversation.participants.find((u) => u.user_id !== me.user_id)}>{conversation.title}</ProfileLink> : conversation.title}</h2>
    <p className="break-words text-sm">Participantes: {conversation.participants.map((u, index) => <span key={u.user_id}>{index > 0 && ", "}<ProfileLink user={u}>@{u.username}</ProfileLink></span>)}</p>
    <p role="status" className="text-sm text-primary">{status}</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-4 text-sm"><button onClick={() => setRetry((n) => n + 1)} className="underline">Reconectar</button><Link href="/login" className="underline">Entrar novamente</Link></div>
    {more && messages.length > 0 && <button disabled={loadingHistory} onClick={async () => { setLoadingHistory(true); try { const older = await getMessages(conversation.conversation_id, messages[0].message_id); setMessages((items) => mergeMessages(items, older)); setMore(older.length === 50); } catch (e) { setError(e instanceof Error ? e.message : "Erro no histórico"); } finally { setLoadingHistory(false); } }} className="rounded-xl border p-3">Carregar mensagens anteriores</button>}
    <ol aria-label="Mensagens" aria-live="polite" className="max-h-[55dvh] space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3">
      {messages.map((m) => <li key={m.message_id} className={"max-w-[95%] rounded-xl p-3 " + (m.sender_id === me.user_id ? "ml-auto bg-primary/10" : "bg-white")}><p className="text-xs font-semibold"><ProfileLink user={conversation.participants.find((u) => u.user_id === m.sender_id)} userId={m.sender_id}>{conversation.participants.find((u) => u.user_id === m.sender_id)?.username ?? "Participante"}</ProfileLink> · {new Date(m.created_at).toLocaleString("pt-BR")}</p><p className="whitespace-pre-wrap break-words">{m.content}</p></li>)}
      {!messages.length && <li className="text-sm text-gray-600">As mensagens desta conversa aparecerão aqui.</li>}
    </ol>
    {conversation.kind === "legacy" ? <p className="rounded-xl bg-amber-50 p-3">Histórico de conversa anterior. Para enviar uma nova mensagem, abra o perfil da pessoa.</p> : <form onSubmit={send} className="space-y-3"><label className="block font-semibold">Mensagem<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} required rows={3} className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
      <button disabled={sending || !text.trim()} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{sending ? "Enviando..." : "Enviar mensagem"}</button>
    </form>}
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
  return <div className="mx-auto max-w-5xl space-y-5"><h1 className="text-3xl font-bold">Conversas</h1>
    <p>Para conversar com alguém, abra o perfil da pessoa e clique em “Enviar mensagem”. Os chats das suas equipes aparecem automaticamente.</p>
    <button onClick={() => setRevision((n) => n + 1)} className="rounded-xl border px-5 py-3">Atualizar conversas</button>
    {loaded !== key ? <p role="status">Carregando conversas...</p> : <>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="min-w-0 space-y-5">
        {(["direct", "team", "legacy"] as const).map((kind) => {
          const items = conversations.filter((c) => c.kind === kind);
          if (kind === "legacy" && !items.length) return null;
          return <section key={kind} className="space-y-2" aria-label={kind === "direct" ? "Mensagens diretas" : kind === "team" ? "Equipes" : "Históricos anteriores"}>
            <h2 className="font-semibold">{kind === "direct" ? "Mensagens diretas" : kind === "team" ? "Equipes" : "Históricos anteriores"}</h2>
            {items.map((c) => <button key={c.conversation_id} onClick={() => router.replace("/chat?conversation=" + c.conversation_id)} className={"block w-full break-words rounded-xl border p-4 text-left " + (selected?.conversation_id === c.conversation_id ? "bg-primary text-white" : "bg-white")}>{c.title}</button>)}
            {!items.length && <p className="text-sm text-gray-600">Nenhuma conversa carregada.</p>}
          </section>;
        })}
        {more && <button disabled={busy} onClick={older} className="p-3 underline disabled:opacity-50">{busy ? "Carregando..." : "Carregar conversas anteriores"}</button>}
      </aside>{selected && me ? <Room key={selected.conversation_id} conversation={selected} me={me} /> : <p className="rounded-2xl bg-white p-8">Selecione uma conversa. Para começar uma mensagem direta, visite o perfil da pessoa.</p>}</div>
    </>}
  </div>;
}

export default function ChatPage() {
  return <Suspense fallback={<p role="status">Carregando conversas...</p>}><ChatContent /></Suspense>;
}
