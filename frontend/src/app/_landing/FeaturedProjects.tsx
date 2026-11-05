"use client";
/* eslint-disable @next/next/no-img-element -- capas vêm do backend em qualquer origem. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { mediaUrl, searchProjects, type ProjectPage } from "@/lib/api";
import { EmptyState, ProjectGridSkeleton, TileCover } from "@/app/_components/ui/primitives";

/** Prova honesta: só mostra o que o backend devolve como projeto público. */
export default function FeaturedProjects() {
  const [data, setData] = useState<ProjectPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    searchProjects({ public_only: true, limit: 3 })
      .then((page) => { if (active) setData(page); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <ProjectGridSkeleton count={3} />;
  if (failed || !data || data.items.length === 0) {
    return (
      <EmptyState
        title={failed ? "Não conseguimos carregar os projetos agora" : "Os primeiros projetos chegam em breve"}
        action={<Link href={failed ? "/home" : "/projetos"} className="ui-button ui-button-primary">{failed ? "Tentar na vitrine" : "Seja o primeiro a apresentar"}</Link>}
      >
        {failed ? "Tente de novo em instantes. A vitrine completa continua aberta." : "Ainda não há projetos públicos cadastrados. Quando houver, eles aparecem aqui."}
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-6">
      <ul className="grid gap-5 md:grid-cols-3">
        {data.items.map((project) => (
          <li key={project.project_id} className="min-w-0">
            <Link href={"/projeto/" + project.project_id} className="project-card block h-full">
              <div className="project-card-cover aspect-[16/10]">
                {project.cover_url
                  ? <img src={mediaUrl(project.cover_url)} alt="" className="h-full w-full object-cover" />
                  : <TileCover seed={project.category?.description ?? project.name} label={project.name} />}
              </div>
              <div className="grid gap-2 p-5">
                <h3 className="line-clamp-2 break-words font-heading text-xl font-bold tracking-tight text-secondary">{project.name}</h3>
                <p className="text-sm font-semibold text-primary">{project.category?.description ?? "Ideias da comunidade"}</p>
                <p className="line-clamp-3 break-words text-[15px] text-muted">{project.description || "Conheça este projeto."}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/home" className="ui-button justify-self-start">
        {data.total > data.items.length ? "Ver os " + data.total + " projetos" : "Ver na vitrine"}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
