"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderKanban, Heart, MessagesSquare, Plus, Users } from "lucide-react";

import { listTeams, searchProjects, type Project, type User } from "@/lib/api";
import { displayNameOf } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import { Skeleton } from "@/app/_components/ui/primitives";

type Stats = { projects: number; teams: number | null };

const shortcut = "flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold text-secondary transition-colors hover:bg-primary-soft hover:text-primary";

/** Coluna direita do feed: perfil resumido, ranking de curtidas, números da comunidade e atalhos. */
export default function FeedSidebar({ me, posts }: { me: User | null; posts: number }) {
  const [ranking, setRanking] = useState<Project[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    searchProjects({ sort: "likes", public_only: true, limit: 5 })
      .then((page) => { if (!active) return; setRanking(page.items.filter((p) => p.likes_count > 0)); setStats((s) => ({ projects: page.total, teams: s?.teams ?? null })); })
      .catch(() => { if (active) setRanking([]); });
    listTeams()
      .then((teams) => { if (active) setStats((s) => ({ projects: s?.projects ?? 0, teams: teams.length })); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <aside aria-label="Destaques da comunidade" className="grid content-start gap-4">
      {me && (
        <section className="ui-panel p-4">
          <Link href="/perfil" className="flex min-h-11 items-center gap-3">
            <Avatar user={me} className="h-12 w-12 text-base" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-secondary">{displayNameOf(me)}</span>
              <span className="block truncate text-[13px] text-muted">@{me.username}</span>
            </span>
          </Link>
        </section>
      )}

      <section aria-labelledby="ranking-titulo" className="ui-panel p-4">
        <h2 id="ranking-titulo" className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight text-secondary">
          <Heart size={18} className="text-accent" aria-hidden="true" />Projetos mais curtidos
        </h2>
        {ranking === null ? (
          <div className="mt-3 grid gap-3" role="status" aria-label="Carregando ranking">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : ranking.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">Ainda não há curtidas. Curta um projeto para ele aparecer aqui.</p>
        ) : (
          <ol className="mt-2 grid">
            {ranking.map((project, i) => (
              <li key={project.project_id}>
                <Link href={`/projeto/${project.project_id}`} className="flex min-h-12 items-center gap-3 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-primary-soft">
                  <span aria-hidden="true" className={"grid h-7 w-7 shrink-0 place-items-center rounded-full font-heading text-[13px] font-extrabold " + (i === 0 ? "bg-sun text-secondary" : "bg-surface-2 text-secondary")}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-secondary">{project.name}</span>
                    <span className="block truncate text-[13px] text-muted">{project.category?.description ?? "Sem categoria"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-strong" aria-label={`${project.likes_count} curtidas`}>
                    <Heart size={14} aria-hidden="true" />{project.likes_count}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="numeros-titulo" className="ui-panel p-4">
        <h2 id="numeros-titulo" className="font-heading text-lg font-extrabold tracking-tight text-secondary">A comunidade em números</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[12px] bg-primary-soft px-2 py-3"><dt className="text-[12px] font-semibold text-muted">Projetos</dt><dd className="font-heading text-2xl font-extrabold text-primary">{stats ? stats.projects : "–"}</dd></div>
          <div className="rounded-[12px] bg-teal-soft px-2 py-3"><dt className="text-[12px] font-semibold text-muted">Equipes</dt><dd className="font-heading text-2xl font-extrabold text-teal">{stats?.teams ?? "–"}</dd></div>
          <div className="rounded-[12px] bg-accent-soft px-2 py-3"><dt className="text-[12px] font-semibold text-muted">Posts</dt><dd className="font-heading text-2xl font-extrabold text-accent-strong">{posts}</dd></div>
        </dl>
      </section>

      <nav aria-label="Atalhos" className="ui-panel grid p-2">
        <Link href="/projetos" className={shortcut}><Plus size={18} aria-hidden="true" />Criar ou editar projeto</Link>
        <Link href="/equipes" className={shortcut}><Users size={18} aria-hidden="true" />Minhas equipes</Link>
        <Link href="/chat" className={shortcut}><MessagesSquare size={18} aria-hidden="true" />Mensagens</Link>
        <Link href="/home" className={shortcut}><FolderKanban size={18} aria-hidden="true" />Explorar a vitrine</Link>
      </nav>
    </aside>
  );
}
