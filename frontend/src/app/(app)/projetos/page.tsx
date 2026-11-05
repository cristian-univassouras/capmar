"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createProject, listCategories, getStoredUser, type Category } from "@/lib/api";
import ProjectForm, { OpenPanel } from "@/app/_components/ProjectForm";
import ProjectBrowser from "@/app/_components/ProjectBrowser";
import { ProjectGridSkeleton, Skeleton } from "@/app/_components/ui/primitives";

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
  const newProject = <button onClick={() => setOpen(true)} className="ui-button ui-button-primary"><Plus size={18} aria-hidden="true" />Novo projeto</button>;
  return <div className="page-enter mx-auto grid max-w-6xl gap-6">
    <div className="ui-page-heading !mb-0">
      <div><h1>Meus projetos</h1><p>Um lugar para organizar e desenvolver suas iniciativas.</p></div>
      {!open && <div className="flex flex-wrap gap-3"><Link href="/home" className="ui-button">Explorar a comunidade</Link>{newProject}</div>}
    </div>
    {open && (categories ? <OpenPanel><ProjectForm categories={categories} onCancel={() => setOpen(false)} onSave={async (payload) => {
      const created = await createProject(payload);
      router.push("/projeto/" + created.project_id);
    }} /></OpenPanel> : error ? <div role="alert" className="ui-error flex flex-wrap items-center justify-between gap-3"><p>{error}</p><button className="ui-button" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div> : <div role="status" aria-busy="true" aria-label="Carregando formulário" className="ui-panel grid gap-4 p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>)}
    {!open && <Suspense fallback={<ProjectGridSkeleton count={3} />}><ProjectBrowser ownerId={ownerId} manage emptyAction={newProject} /></Suspense>}
  </div>;
}
