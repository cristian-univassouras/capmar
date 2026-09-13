"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, listCategories, type Category } from "@/lib/api";
import ProjectForm from "@/app/_components/ProjectForm";
import ProjectBrowser from "@/app/_components/ProjectBrowser";

export default function ProjetosPage() {
  const router = useRouter();
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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-heading text-3xl font-black text-primary">Projetos</h1><p className="mt-1 text-sm text-gray-600">Encontre projetos e cadastre suas iniciativas.</p></div>
      <button onClick={() => setOpen(true)} disabled={open} className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">Novo projeto</button>
    </div>
    {open && (categories ? <ProjectForm categories={categories} onCancel={() => setOpen(false)} onSave={async (payload) => {
      const created = await createProject(payload);
      router.push("/projeto/" + created.project_id);
    }} /> : error ? <div role="alert"><p>{error}</p><button className="underline" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div> : <p role="status">Carregando formulário...</p>)}
    <Suspense fallback={<p role="status">Carregando projetos...</p>}><ProjectBrowser /></Suspense>
  </div>;
}
