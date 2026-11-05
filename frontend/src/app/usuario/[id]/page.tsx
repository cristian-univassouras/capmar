"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ApiError, getUser, getStoredUser, type Author, type User } from "@/lib/api";
import { createDirectConversation } from "@/lib/engagement";
import { displayNameOf } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import PublicFrame from "@/app/_components/PublicFrame";
import ProjectBrowser from "@/app/_components/ProjectBrowser";
import { setShellCrumb } from "@/app/(app)/AppShell";
import { ProjectGridSkeleton, Skeleton } from "@/app/_components/ui/primitives";
import { useSessionRevision } from "@/lib/use-session-revision";

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
  const sessionRevision = useSessionRevision();
  const key = id + ":" + attempt + ":" + sessionRevision;
  useEffect(() => {
    let active = true;
    // A identidade vem da cópia guardada (o PublicFrame já confirma a sessão), sem outra chamada a /auth/me.
    const syncMe = () => { if (active) setMe(getStoredUser()); };
    syncMe();
    window.addEventListener("capmar-user-changed", syncMe);
    getUser(Number(id)).then((value) => { if (active) { setUser(value); setError(""); } })
      .catch((err) => { if (active) { setUser(null); setError(err instanceof ApiError && err.status === 404 ? "Perfil não encontrado." : "Não foi possível carregar o perfil."); } })
      .finally(() => { if (active) setLoaded(key); });
    return () => { active = false; window.removeEventListener("capmar-user-changed", syncMe); };
  }, [id, attempt, key]);
  const handle = user?.username;
  useEffect(() => {
    setShellCrumb(handle ? "Perfil de @" + handle : null);
    return () => setShellCrumb(null);
  }, [handle]);
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
  return <PublicFrame>
    <Link href="/home" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary hover:underline">← Explorar projetos</Link>
    {loaded !== key ? <div role="status" aria-busy="true" aria-label="Carregando perfil" className="grid gap-6"><div className="ui-panel flex items-center gap-4 p-6"><Skeleton className="h-20 w-20 !rounded-full" /><div className="grid gap-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-28" /></div></div><ProjectGridSkeleton count={3} /></div> : user ? <>
      <section className="ui-panel overflow-hidden">
        <div className="tile tile-b h-16" aria-hidden="true" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-6">
          <Avatar user={user} className="-mt-10 h-20 w-20 border-4 border-surface text-2xl" />
          <div className="min-w-0 flex-1 pt-3"><h1 className="break-words font-heading text-3xl font-extrabold tracking-tight text-secondary">{displayNameOf(user)}</h1><p className="text-[15px] text-muted">@{user.username}</p></div>
          {me?.user_id !== user.user_id && <button disabled={sending} onClick={startChat} aria-busy={sending} className="ui-button ui-button-primary"><MessageCircle size={18} aria-hidden="true" />{sending ? "Abrindo conversa..." : "Enviar mensagem"}</button>}
        </div>
      </section>
      {chatError && <p role="alert" className="ui-error shake">{chatError}</p>}
      <h2 className="font-heading text-2xl font-bold text-secondary">Projetos públicos</h2>
      <Suspense fallback={<ProjectGridSkeleton count={3} />}><ProjectBrowser publicOnly ownerId={user.user_id} /></Suspense>
    </> : <div role="alert" className="ui-panel grid justify-items-start gap-3 p-6"><p className="text-[15px]">{error}</p><button className="ui-button" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>}
  </PublicFrame>;
}
