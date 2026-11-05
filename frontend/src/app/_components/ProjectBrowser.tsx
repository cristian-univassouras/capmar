"use client";
/* eslint-disable @next/next/no-img-element -- Mídias privadas precisam do cookie enviado pelo navegador. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { listCategories, searchProjects, mediaUrl, type Category, type ProjectPage } from "@/lib/api";
import { statusBadgeClass, statusLabel } from "@/lib/format";
import { EmptyState, ProjectGridSkeleton, TileCover } from "@/app/_components/ui/primitives";

const PAGE_SIZE = 12;
export default function ProjectBrowser({ publicOnly = false, ownerId, refresh = 0, emptyAction, manage = false }: {
  publicOnly?: boolean; ownerId?: number; refresh?: number; emptyAction?: React.ReactNode; manage?: boolean;
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
  const filtered = Boolean(q || category);
  return <section aria-label="Busca de projetos" className="project-browser grid min-w-0 gap-5">
    <form key={q + "|" + category} onSubmit={submit} className="ui-panel grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-end">
      <label className="ui-field">Buscar projetos<input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Nome, descrição ou palavra-chave" /></label>
      <label className="ui-field">Categoria<select name="category" defaultValue={category}><option value="">Todas as categorias</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.description}</option>)}</select></label>
      <div className="flex gap-2">
        <button className="ui-button ui-button-primary flex-1 sm:flex-none">Buscar</button>
        {filtered && <button type="button" onClick={() => navigate({ q: "", category: "", page: 1 })} className="ui-button ui-button-quiet">Limpar</button>}
      </div>
    </form>
    {(error || categoryError) && <div role="alert" className="ui-error flex flex-wrap items-center justify-between gap-3"><p>{error || categoryError}</p><button onClick={() => setRetry((n) => n + 1)} className="ui-button">Tentar novamente</button></div>}
    {loading ? <ProjectGridSkeleton count={6} /> : data && <>
      <p role="status" className="text-[15px] text-muted"><span key={data.total} className="number-in font-semibold text-secondary">{data.total}</span> {data.total === 1 ? "projeto" : "projetos"}{q && <> para “{q}”</>}</p>
      {data.items.length ? <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((project, index) => {
          const categoryName = project.category?.description ?? "Sem categoria";
          return <div key={project.project_id} style={{ "--i": Math.min(index, 8) } as React.CSSProperties} className="project-card flex min-w-0 flex-col">
            <Link href={"/projeto/" + project.project_id} className="flex min-w-0 flex-1 flex-col focus-visible:outline-2 focus-visible:outline-primary">
              <div className="project-card-cover relative aspect-[16/9]">
                {project.cover_url ? <img src={mediaUrl(project.cover_url)} alt="" className="h-full w-full object-cover" /> : <TileCover seed={categoryName} label={project.name} />}
                {project.logo_url && <img src={mediaUrl(project.logo_url)} alt="" className="absolute bottom-3 left-3 h-12 w-12 rounded-xl border-2 border-surface object-cover" />}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="line-clamp-2 break-words font-heading text-lg font-bold text-secondary">{project.name}</h2>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted"><span>{categoryName}</span><span className={statusBadgeClass(project.status)}>{statusLabel(project.status)}</span><span className={"ui-badge " + (project.visibility ? "is-public" : "is-private")}>{project.visibility ? "Público" : "Privado"}</span></p>
                <p className="line-clamp-3 break-words text-[15px] text-muted">{project.description || "Conheça este projeto."}</p>
                {project.keywords.length > 0 && <div className="flex flex-wrap gap-1.5">{project.keywords.slice(0, 3).map((tag) => <span key={tag.keyword_id} className="max-w-full truncate rounded-lg bg-primary-soft px-2 py-1 text-[13px] text-primary-strong">#{tag.word}</span>)}{project.keywords.length > 3 && <span className="px-1 py-1 text-[13px] text-muted">+{project.keywords.length - 3}</span>}</div>}
                <p className="mt-auto flex items-center gap-4 pt-1 text-[13px] text-muted"><span className="inline-flex items-center gap-1.5"><Heart size={15} aria-hidden="true" />{project.likes_count} {project.likes_count === 1 ? "curtida" : "curtidas"}</span><span className="inline-flex items-center gap-1.5"><MessageCircle size={15} aria-hidden="true" />{project.comments_count} {project.comments_count === 1 ? "comentário" : "comentários"}</span></p>
              </div>
            </Link>
            {manage && <div className="flex gap-2 border-t border-line p-3">
              <Link href={"/projeto/" + project.project_id} className="ui-button flex-1" aria-label={"Abrir " + project.name}>Abrir</Link>
              <Link href={"/projeto/" + project.project_id + "?editar=1"} className="ui-button flex-1" aria-label={"Editar " + project.name}>Editar</Link>
            </div>}
          </div>;
        })}
      </div> : <EmptyState
        title={filtered ? "Nenhum projeto com esses filtros" : ownerId ? publicOnly ? "Nenhum projeto público por aqui" : "Seu primeiro projeto começa aqui" : "Ainda não há projetos para explorar"}
        action={filtered ? <button onClick={() => navigate({ q: "", category: "", page: 1 })} className="ui-button">Limpar filtros</button> : emptyAction}>
        {filtered ? "Tente outra palavra ou escolha todas as categorias." : ownerId ? publicOnly ? "Este perfil ainda não tem projetos públicos." : "Cadastre sua iniciativa e deixe a comunidade de Maricá conhecer." : "Quando alguém cadastrar um projeto público, ele aparece aqui."}
      </EmptyState>}
      {data.total > PAGE_SIZE && <nav aria-label="Paginação de projetos" className="flex flex-wrap items-center justify-center gap-4">
        <button disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} className="ui-button">Anterior</button>
        <span className="text-[15px] text-muted">Página {page} de {Math.ceil(data.total / PAGE_SIZE)}</span>
        <button disabled={page * PAGE_SIZE >= data.total || page >= 834} onClick={() => navigate({ page: page + 1 })} className="ui-button">Próxima</button>
      </nav>}
    </>}
  </section>;
}
