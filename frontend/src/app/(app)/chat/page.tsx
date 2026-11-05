"use client";
import ProfileLink from "@/app/_components/ProfileLink";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, getMe, getJson, type Author, type User } from "@/lib/api";
import { createDirectConversation, getConversation, getTeamConversation, getConversations, getMessages, sendMessage, type Conversation, type Message } from "@/lib/engagement";

import { Avatar } from "@/app/_components/media";
import { displayNameOf } from "@/lib/format";
import { ArrowLeft, Send, MoreHorizontal, Search, SquarePen, MessagesSquare, X } from "lucide-react";

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
  const other = conversation.participants.find(u=>u.user_id!==me.user_id);
  const scroll=useRef<HTMLOListElement>(null);
  const tail=useRef<number|undefined>(undefined);
  useEffect(()=>{const id=messages.at(-1)?.message_id;if(tail.current!==id){tail.current=id;if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;}},[messages]);
  return <section aria-label="Conversa" className="chat-room">
    <header className="chat-room-header"><Link href="/chat" aria-label="Voltar para conversas" className="ui-icon-button lg:hidden"><ArrowLeft size={20}/></Link><Avatar user={other ?? null} className="h-10 w-10 shrink-0"/><div className="min-w-0 flex-1"><h2 aria-label={conversation.title} className="truncate font-heading text-lg font-bold text-secondary">{conversation.kind==="direct"?<ProfileLink user={other}>{conversation.title}</ProfileLink>:conversation.title}</h2><p role="status" className="mt-1 flex items-center gap-2 text-xs text-gray-500"><span className={"h-1.5 w-1.5 shrink-0 rounded-full "+(status==="Conectado"?"bg-emerald-500":"bg-amber-500")}/>{status}</p></div>
    <details className="chat-options"><summary aria-label="Opções da conversa" className="ui-icon-button"><MoreHorizontal size={21}/></summary><div><button onClick={()=>setRetry(n=>n+1)}>Reconectar</button><details><summary>Participantes ({conversation.participants.length})</summary>{conversation.participants.map(u=><ProfileLink key={u.user_id} user={u}>@{u.username}</ProfileLink>)}</details></div></details></header>
    {status!=="Conectado"&&status!=="Conectando..."&&<div className="chat-connection"><button onClick={()=>setRetry(n=>n+1)}>Tentar reconectar</button>{/Sessão|acesso encerrado/i.test(status)&&<Link href="/login">Entrar novamente</Link>}</div>}
      {more&&messages.length>0&&<div className="chat-history"><button disabled={loadingHistory} onClick={async()=>{setLoadingHistory(true);try{const older=await getMessages(conversation.conversation_id,messages[0].message_id);setMessages(items=>mergeMessages(items,older));setMore(older.length===50);}catch(e){setError(e instanceof Error?e.message:"Erro no histórico");}finally{setLoadingHistory(false);}}}>{loadingHistory?"Carregando...":"Carregar mensagens anteriores"}</button></div>}

    <ol ref={scroll} aria-label="Mensagens" aria-live="polite" className="chat-messages">
      {messages.map(m=><li key={m.message_id} className={"chat-bubble "+(m.sender_id===me.user_id?"is-mine":"")}><div className="chat-bubble-meta"><ProfileLink user={conversation.participants.find(u=>u.user_id===m.sender_id)} userId={m.sender_id}>{conversation.participants.find(u=>u.user_id===m.sender_id)?.username??"Participante"}</ProfileLink><time dateTime={m.created_at} title={new Date(m.created_at).toLocaleString("pt-BR")}>{new Date(m.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p></li>)}
      {!messages.length&&<li className="chat-empty-messages"><MessagesSquare size={28}/><p>A conversa começa por aqui.</p><span>Envie uma mensagem para se apresentar.</span></li>}
    </ol>
    {error&&<p role="alert" className="mx-4 mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {conversation.kind==="legacy"?<p className="m-4 rounded-xl bg-amber-50 p-4 text-sm">Este histórico é somente para leitura. Abra o perfil da pessoa para começar uma nova conversa.</p>:<form onSubmit={send} className="chat-composer"><label className="min-w-0 flex-1"><span className="sr-only">Mensagem</span><textarea aria-label="Mensagem" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} maxLength={2000} required rows={2} placeholder="Escreva sua mensagem…"/></label><button disabled={sending||!text.trim()} aria-label="Enviar mensagem" className="chat-send"><Send size={20}/><span className="sr-only">{sending?"Enviando...":"Enviar mensagem"}</span></button><p className="chat-composer-hint">Enter para enviar · Shift + Enter para uma nova linha</p></form>}
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
  const [query,setQuery]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  const [people,setPeople]=useState<Author[]>([]);
  const [peopleError,setPeopleError]=useState("");
  const [searched,setSearched]=useState(false);
  const [finding,setFinding]=useState(false);
  async function findPeople(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const q=String(new FormData(e.currentTarget).get("person")??"").trim().replace(/^@/,"");if(q.length<2){setPeopleError("Digite pelo menos 2 caracteres para buscar.");return;}setFinding(true);setPeopleError("");try{setPeople((await getJson<Author[]>("/users?q="+encodeURIComponent(q)+"&limit=20")).filter(u=>u.user_id!==me?.user_id));setSearched(true);}catch(e){setPeopleError(e instanceof Error?e.message:"Não foi possível buscar pessoas.");}finally{setFinding(false);}}
  async function start(person:Author){setFinding(true);setPeopleError("");try{const room=await createDirectConversation(person.user_id);dialog.current?.close();router.replace("/chat?conversation="+room.conversation_id);}catch(e){setPeopleError(e instanceof Error?e.message:"Não foi possível abrir a conversa.");}finally{setFinding(false);}}

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
  return <div className="chat-page"><div className="ui-page-heading"><div><h1>Conversas</h1><p>Pessoas e equipes, mais perto das suas ideias.</p></div><button onClick={()=>{setPeople([]);setSearched(false);setPeopleError("");dialog.current?.showModal();}} className="ui-button ui-button-primary"><SquarePen size={17}/>Nova mensagem</button></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loaded!==key?<p role="status" className="ui-panel p-8 text-gray-500">Carregando conversas...</p>:<div className="chat-workspace"><aside className={"chat-sidebar "+(selected?"has-selection":"")}><div className="chat-sidebar-tools"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Buscar nesta lista" placeholder="Buscar nesta lista"/></label><button onClick={()=>setRevision(n=>n+1)} className="chat-refresh">Atualizar conversas</button></div><div className="chat-conversation-list">{(["direct","team","legacy"] as const).map(kind=>{const all=conversations.filter(c=>c.kind===kind);const items=all.filter(c=>c.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));if(kind==="legacy"&&!all.length)return null;return <section key={kind} aria-label={kind==="direct"?"Mensagens diretas":kind==="team"?"Equipes":"Históricos anteriores"}><h2>{kind==="direct"?"Mensagens diretas":kind==="team"?"Equipes":"Históricos anteriores"}</h2>{items.map(c=><button key={c.conversation_id} aria-label={c.title} aria-current={selected?.conversation_id===c.conversation_id?"true":undefined} onClick={()=>router.replace("/chat?conversation="+c.conversation_id)} className={"chat-conversation "+(selected?.conversation_id===c.conversation_id?"is-selected":"")}><Avatar user={c.participants.find(u=>u.user_id!==me?.user_id) ?? null} className="h-10 w-10 shrink-0"/><span className="min-w-0"><strong>{c.title}</strong><span>{kind==="team"?"Conversa da equipe":kind==="legacy"?"Somente leitura":"Mensagem direta"}</span></span></button>)}{!items.length&&<p className="px-4 py-3 text-xs text-gray-400">{query?"Nenhuma conversa nesta lista.":"Nenhuma conversa por enquanto."}</p>}</section>;})}{more&&<button disabled={busy} onClick={older} className="chat-load-more">{busy?"Carregando...":"Carregar conversas anteriores"}</button>}</div></aside>{selected&&me?<Room key={selected.conversation_id} conversation={selected} me={me}/>:<div className="chat-welcome"><span><MessagesSquare size={35}/></span><h2>Uma boa ideia começa com uma conversa.</h2><p>Escolha uma pessoa ou equipe na lista, ou comece uma nova mensagem.</p><button onClick={()=>dialog.current?.showModal()} className="ui-button">Encontrar uma pessoa</button></div>}</div>}
    <dialog ref={dialog} aria-labelledby="new-message-title" className="new-message-dialog"><div className="flex items-center justify-between gap-4"><h2 id="new-message-title" className="font-heading text-xl font-bold text-secondary">Nova mensagem</h2><button aria-label="Fechar nova mensagem" onClick={()=>dialog.current?.close()} className="ui-icon-button"><X size={20}/></button></div><p className="mt-2 text-sm text-gray-500">Encontre alguém da comunidade para conversar.</p><form onSubmit={findPeople} className="mt-5 flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Nome ou usuário</span><input name="person" minLength={2} maxLength={100} required placeholder="Nome ou @usuário" className="w-full rounded-xl border border-gray-200 p-3 text-sm"/></label><button disabled={finding} className="ui-button ui-button-primary">Buscar</button></form>{peopleError&&<p role="alert" className="mt-4 text-sm text-red-700">{peopleError}</p>}<ul className="mt-4 space-y-2">{people.map(person=><li key={person.user_id}><button disabled={finding} onClick={()=>start(person)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-primary/5"><Avatar user={person} className="h-10 w-10"/><span><strong className="block text-sm">{displayNameOf(person)}</strong><span className="text-xs text-gray-500">@{person.username}</span></span></button></li>)}</ul>{searched&&!people.length&&<p className="mt-4 text-sm text-gray-500">Nenhuma pessoa encontrada. Tente outro nome.</p>}</dialog>
  </div>;

}

export default function ChatPage() {
  return <Suspense fallback={<p role="status">Carregando conversas...</p>}><ChatContent /></Suspense>;
}
