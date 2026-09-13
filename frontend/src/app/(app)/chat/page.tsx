"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_URL, getJson, getMe, type Author, type User } from "@/lib/api";
import { createConversation, getConversations, getMessages, sendMessage, type Conversation, type Message } from "@/lib/engagement";

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
    <h2 className="break-words text-2xl font-bold">{conversation.title}</h2>
    <p className="break-words text-sm">Participantes: {conversation.participants.map((u) => "@" + u.username).join(", ")}</p>
    <p role="status" className="text-sm text-primary">{status}</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-4 text-sm"><button onClick={() => setRetry((n) => n + 1)} className="underline">Reconectar</button><Link href="/login" className="underline">Entrar novamente</Link></div>
    {more && messages.length > 0 && <button disabled={loadingHistory} onClick={async () => { setLoadingHistory(true); try { const older = await getMessages(conversation.conversation_id, messages[0].message_id); setMessages((items) => mergeMessages(items, older)); setMore(older.length === 50); } catch (e) { setError(e instanceof Error ? e.message : "Erro no histórico"); } finally { setLoadingHistory(false); } }} className="rounded-xl border p-3">Carregar mensagens anteriores</button>}
    <ol aria-label="Mensagens" aria-live="polite" className="max-h-[55dvh] space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3">
      {messages.map((m) => <li key={m.message_id} className={"max-w-[95%] rounded-xl p-3 " + (m.sender_id === me.user_id ? "ml-auto bg-primary/10" : "bg-white")}><p className="text-xs font-semibold">{conversation.participants.find((u) => u.user_id === m.sender_id)?.username ?? "Participante"} · {new Date(m.created_at).toLocaleString("pt-BR")}</p><p className="whitespace-pre-wrap break-words">{m.content}</p></li>)}
      {!messages.length && <li className="text-sm text-gray-600">As mensagens desta conversa aparecerão aqui.</li>}
    </ol>
    <form onSubmit={send} className="space-y-3"><label className="block font-semibold">Mensagem<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} required rows={3} className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
      <button disabled={sending || !text.trim()} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{sending ? "Enviando..." : "Enviar mensagem"}</button>
    </form>
  </section>;
}

export default function ChatPage() {
  const [me, setMe] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [people, setPeople] = useState<Author[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getMe(), getConversations()]).then(([user, items]) => { if (active) { setMe(user); setConversations(items); } }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    let active = true;
    getJson<Author[]>("/users?limit=20&skip=" + page * 20 + "&q=" + encodeURIComponent(query)).then((items) => { if (active) setPeople(items); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [query, page]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const room = await createConversation(String(new FormData(event.currentTarget).get("title")), chosen); setConversations((items) => [room, ...items]); setSelected(room); setChosen([]); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao criar conversa"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-5xl space-y-5"><h1 className="text-3xl font-bold">Conversas</h1><p>Somente os participantes podem ler e enviar mensagens. Os participantes são definidos ao criar a conversa.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3"><button onClick={() => setOpen(!open)} className="rounded-xl bg-primary px-5 py-3 text-white">{open ? "Fechar formulário" : "Nova conversa"}</button><button onClick={() => setRevision((n) => n + 1)} className="rounded-xl border px-5 py-3">Atualizar conversas</button></div>
    {open && <div className="space-y-4 rounded-2xl bg-white p-5"><form onSubmit={(e) => { e.preventDefault(); setQuery(String(new FormData(e.currentTarget).get("q"))); setPage(0); }} className="flex gap-3"><input aria-label="Buscar participantes" name="q" maxLength={100} className="min-w-0 flex-1 rounded-xl border p-3" /><button className="rounded-xl border p-3">Buscar</button></form>
      <form aria-label="Nova conversa" onSubmit={create} className="space-y-4"><label className="block">Título da conversa<input name="title" required maxLength={100} className="mt-1 w-full rounded-xl border p-3" /></label>
        <fieldset className="space-y-2"><legend className="font-semibold">Participantes ({chosen.length}/19 selecionados)</legend>{people.filter((u) => u.user_id !== me?.user_id).map((u) => <label key={u.user_id} className="flex items-center gap-3 py-1"><input type="checkbox" checked={chosen.includes(u.user_id)} disabled={!chosen.includes(u.user_id) && chosen.length >= 19} onChange={(e) => setChosen((ids) => e.target.checked ? [...ids, u.user_id] : ids.filter((id) => id !== u.user_id))} />@{u.username}</label>)}</fieldset>
        <div className="flex gap-3"><button type="button" disabled={!page} onClick={() => setPage((n) => n - 1)} className="rounded-xl border p-2 disabled:opacity-40">Pessoas anteriores</button><button type="button" disabled={people.length < 20} onClick={() => setPage((n) => n + 1)} className="rounded-xl border p-2 disabled:opacity-40">Próximas pessoas</button></div>
        <button disabled={busy || !chosen.length} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{busy ? "Criando..." : "Criar conversa"}</button>
      </form></div>}
    <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="space-y-2"><h2 className="font-semibold">Suas conversas</h2>{conversations.map((c) => <button key={c.conversation_id} onClick={() => setSelected(c)} className={"block w-full break-words rounded-xl border p-4 text-left " + (selected?.conversation_id === c.conversation_id ? "bg-primary text-white" : "bg-white")}>{c.title}</button>)}
      {!conversations.length && <p className="text-sm">Nenhuma conversa carregada.</p>}
      {conversations.length > 0 && <button disabled={busy} onClick={async () => { setBusy(true); try { const older = await getConversations(conversations.at(-1)!.conversation_id); setConversations((items) => [...items, ...older]); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar"); } finally { setBusy(false); } }} className="p-3 underline">Carregar conversas anteriores</button>}
    </aside>{selected && me ? <Room key={selected.conversation_id} conversation={selected} me={me} /> : <p className="rounded-2xl bg-white p-8">Selecione ou crie uma conversa para começar.</p>}</div>
  </div>;
}
