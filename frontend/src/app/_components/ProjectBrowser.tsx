"use client";
/* eslint-disable @next/next/no-img-element -- Mídias privadas precisam do cookie enviado pelo navegador. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listCategories, searchProjects, mediaUrl, type Category, type ProjectPage } from "@/lib/api";

const PAGE_SIZE = 12;
export default function ProjectBrowser({ publicOnly = false, ownerId, refresh = 0 }: {
  publicOnly?: boolean; ownerId?: number; refresh?: number;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const page = Math.max(1, Math.min(834, Math.floor(Number(params.get("page"))) || 1));
  const [data, setData] = useState<ProjectPage | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [pending, setPending] = useState(true);
  const [retry, setRetry] = useState(0);
  const [resolved, setResolved] = useState("");
  const requestKey = JSON.stringify([q, category, page, publicOnly, ownerId, refresh, retry]);
  const loading = pending || resolved !== requestKey;
  useEffect(() => {
    listCategories().then((items) => { setCategories(items); setCategoryError(""); })
      .catch(() => setCategoryError("Não foi possível carregar as categorias. Tente novamente."));
  }, [retry]);
  useEffect(() => {
    let active = true;
    searchProjects({ q, category_id: category ? Number(category) : undefined,
      skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, public_only: publicOnly, owner_id: ownerId })
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((err) => { if (active) { setData(null); setError(err.message || "Falha ao buscar projetos."); } })
      .finally(() => { if (active) { setPending(false); setResolved(requestKey); } });
    return () => { active = false; };
  }, [q, category, page, publicOnly, ownerId, refresh, retry, requestKey]);
  function navigate(values: { q?: string; category?: string; page?: number }) {
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value === "" || value === 1) query.delete(key); else query.set(key, String(value));
    }
    router.push(pathname + (query.size ? "?" + query : ""), { scroll: false });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const term = String(form.get("q")).trim();
    if (term.length === 1) { setError("Digite pelo menos 2 caracteres para buscar."); return; }
    setError("");
    navigate({ q: term, category: String(form.get("category")), page: 1 });
  }
  return <section aria-label="Busca de projetos" className="space-y-5 min-w-0">
    <form key={q + "|" + category} onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-white p-4 border border-gray-200 sm:flex-row sm:items-end">
      <label className="flex-1 min-w-0 text-sm font-semibold">Buscar projetos<input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Nome, descrição ou palavra-chave" className="mt-1 w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3" /></label>
      <label className="text-sm font-semibold sm:max-w-60">Categoria<select name="category" defaultValue={category} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3"><option value="">Todas as categorias</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.description}</option>)}</select></label>
      <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">Buscar</button>
      {(q || category) && <button type="button" onClick={() => navigate({ q: "", category: "", page: 1 })} className="rounded-xl border border-gray-300 px-4 py-3">Limpar</button>}
    </form>
    {(error || categoryError) && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700"><p>{error || categoryError}</p><button onClick={() => setRetry((n) => n + 1)} className="mt-2 underline">Tentar novamente</button></div>}
    {loading ? <p role="status" className="py-12 text-center text-gray-600">Carregando projetos...</p> : data && <>
      <p role="status" className="text-sm text-gray-600">{data.total} projeto(s) encontrado(s)</p>
      {data.items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((project) => <Link key={project.project_id} href={"/projeto/" + project.project_id}
          className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
          <div className="relative h-32 bg-gradient-to-br from-primary/15 to-secondary/15">
            {project.cover_url && <img src={mediaUrl(project.cover_url)} alt="" className="h-full w-full object-cover" />}
            {project.logo_url && <img src={mediaUrl(project.logo_url)} alt="" className="absolute bottom-3 left-3 h-12 w-12 rounded-xl border-2 border-white object-cover" />}
          </div>
          <div className="space-y-3 p-5">
            <h2 className="break-words font-heading text-lg font-bold">{project.name}</h2>
            <p className="text-xs text-gray-600">{project.category?.description ?? "Sem categoria"} · {project.status}{!project.visibility && " · Privado"}</p>
            <p className="line-clamp-3 break-words text-sm text-gray-600">{project.description || "Conheça este projeto."}</p>
            <div className="flex flex-wrap gap-1">{project.keywords.map((tag) => <span key={tag.keyword_id} className="break-all rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary">#{tag.word}</span>)}</div>
            <p className="text-sm text-primary">{project.likes_count} curtidas · {project.comments_count} comentários</p>
            <span className="inline-block text-sm font-semibold text-primary">Ver projeto →</span>
          </div>
        </Link>)}
      </div> : <p className="rounded-2xl bg-white p-8 text-center text-gray-600">Nenhum projeto encontrado com esses filtros.</p>}
      {data.total > PAGE_SIZE && <nav aria-label="Paginação de projetos" className="flex flex-wrap items-center justify-center gap-4">
        <button disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} className="rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:opacity-40">Anterior</button>
        <span className="text-sm">Página {page} de {Math.ceil(data.total / PAGE_SIZE)}</span>
        <button disabled={page * PAGE_SIZE >= data.total || page >= 834} onClick={() => navigate({ page: page + 1 })} className="rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:opacity-40">Próxima</button>
      </nav>}
    </>}
  </section>;
}
