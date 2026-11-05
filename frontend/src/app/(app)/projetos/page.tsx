"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, listCategories, getStoredUser, type Category } from "@/lib/api";
import ProjectForm from "@/app/_components/ProjectForm";
import ProjectBrowser from "@/app/_components/ProjectBrowser";

export default function ProjetosPage() {
  const router = useRouter();
  const [ownerId] = useState(() => getStoredUser()?.user_id);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listCategories().then((items) => { if (active) { setCategories(items); setError(""); } })
      .catch(() => { if (active) setError("Não foi possível carregar o formulário. Tente novamente."); });
    return () => { active = false; };
  }, [attempt]);
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="ui-page-heading">
      <div><h1 className="font-heading text-3xl font-black text-primary">Projetos</h1><p className="mt-1 text-sm text-gray-600">Um lugar para organizar e desenvolver suas iniciativas.</p></div>
      <div className="flex flex-wrap gap-3"><Link href="/home" className="ui-button">Explorar comunidade ↗</Link><button onClick={() => setOpen(true)} disabled={open} className="ui-button ui-button-primary">Novo projeto</button></div>
    </div>
    {open && (categories ? <ProjectForm categories={categories} onCancel={() => setOpen(false)} onSave={async (payload) => {
      const created = await createProject(payload);
      router.push("/projeto/" + created.project_id);
    }} /> : error ? <div role="alert"><p>{error}</p><button className="underline" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div> : <p role="status">Carregando formulário...</p>)}
    {!open && <><div className="border-b border-gray-200 pb-3 text-sm font-semibold text-primary">Meus projetos</div><Suspense fallback={<p role="status">Carregando projetos...</p>}><ProjectBrowser ownerId={ownerId}/></Suspense></>}
  </div>;
}
