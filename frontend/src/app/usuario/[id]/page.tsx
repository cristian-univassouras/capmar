"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, getUser, type Author } from "@/lib/api";
import { displayNameOf } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import PublicHeader from "@/app/_components/PublicHeader";
import ProjectBrowser from "@/app/_components/ProjectBrowser";

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<Author | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState("");
  const key = id + ":" + attempt;
  useEffect(() => {
    let active = true;
    getUser(Number(id)).then((value) => { if (active) { setUser(value); setError(""); } })
      .catch((err) => { if (active) { setUser(null); setError(err instanceof ApiError && err.status === 404 ? "Perfil não encontrado." : "Não foi possível carregar o perfil."); } })
      .finally(() => { if (active) setLoaded(key); });
    return () => { active = false; };
  }, [id, attempt, key]);
  return <div className="min-h-screen bg-background"><PublicHeader /><main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <Link href="/home" className="text-primary">← Explorar projetos</Link>
    {loaded !== key ? <p role="status">Carregando perfil...</p> : user ? <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-6"><Avatar user={user} className="h-20 w-20 text-2xl" /><div className="min-w-0"><h1 className="break-words font-heading text-3xl font-bold">{displayNameOf(user)}</h1><p>@{user.username}</p></div></section>
      <h2 className="text-2xl font-bold">Projetos públicos</h2>
      <Suspense fallback={<p role="status">Carregando projetos...</p>}><ProjectBrowser publicOnly ownerId={user.user_id} /></Suspense>
    </> : <div role="alert"><p>{error}</p><button className="mt-3 underline" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>}
  </main></div>;
}
