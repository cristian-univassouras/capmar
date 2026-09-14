"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getUser, getOptionalMe, type Author, type User } from "@/lib/api";
import { createDirectConversation } from "@/lib/engagement";
import { displayNameOf } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import PublicHeader from "@/app/_components/PublicHeader";
import ProjectBrowser from "@/app/_components/ProjectBrowser";

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [user, setUser] = useState<Author | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState("");
  const key = id + ":" + attempt;
  useEffect(() => {
    let active = true;
    getOptionalMe().then((value) => { if (active) setMe(value); }).catch(() => {});
    getUser(Number(id)).then((value) => { if (active) { setUser(value); setError(""); } })
      .catch((err) => { if (active) { setUser(null); setError(err instanceof ApiError && err.status === 404 ? "Perfil não encontrado." : "Não foi possível carregar o perfil."); } })
      .finally(() => { if (active) setLoaded(key); });
    return () => { active = false; };
  }, [id, attempt, key]);
  async function startChat() {
    setSending(true); setChatError("");
    try {
      const room = await createDirectConversation(Number(id));
      router.push("/chat?conversation=" + room.conversation_id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.push("/login?next=" + encodeURIComponent("/usuario/" + id));
      else setChatError(err instanceof Error ? err.message : "Não foi possível iniciar a conversa.");
    } finally { setSending(false); }
  }
  return <div className="min-h-screen bg-background"><PublicHeader /><main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <Link href="/home" className="text-primary">← Explorar projetos</Link>
    {loaded !== key ? <p role="status">Carregando perfil...</p> : user ? <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-6"><Avatar user={user} className="h-20 w-20 text-2xl" /><div className="min-w-0"><h1 className="break-words font-heading text-3xl font-bold">{displayNameOf(user)}</h1><p>@{user.username}</p></div>{me?.user_id !== user.user_id && <button disabled={sending} onClick={startChat} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{sending ? "Abrindo conversa..." : "Enviar mensagem"}</button>}</section>
      {chatError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{chatError}</p>}
      <h2 className="text-2xl font-bold">Projetos públicos</h2>
      <Suspense fallback={<p role="status">Carregando projetos...</p>}><ProjectBrowser publicOnly ownerId={user.user_id} /></Suspense>
    </> : <div role="alert"><p>{error}</p><button className="mt-3 underline" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>}
  </main></div>;
}
