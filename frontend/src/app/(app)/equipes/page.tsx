"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

import { createTeam, searchProjects, getMe, listTeams, type Project, type Team } from "@/lib/api";
import { formatDate, initialsOf, tileClassFor } from "@/lib/format";
import { OpenPanel } from "@/app/_components/ProjectForm";
import { EmptyState, ListSkeleton } from "@/app/_components/ui/primitives";
import { useToast } from "@/app/_components/ui/feedback";

/** Avatar da equipe: azulejo e iniciais derivados do nome, estáveis para a mesma equipe. */
function TeamAvatar({ name, className = "h-12 w-12 text-base" }: { name: string; className?: string }) {
  return <div aria-hidden="true" className={`tile ${tileClassFor(name)} flex shrink-0 items-center justify-center rounded-xl ${className}`}>
    <span className="rounded-md bg-surface px-1.5 font-heading font-extrabold leading-tight text-secondary">{initialsOf(name)}</span>
  </div>;
}

export default function EquipesPage() {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listTeams(), getMe().then((me) => searchProjects({ owner_id: me.user_id, limit: 100 }))])
      .then(([t, p]) => { if (active) { setTeams(t); setProjects(p.items); setLoadError(null); } })
      .catch((err) => { if (active) setLoadError(err instanceof Error ? err.message : "Erro ao carregar."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => { if (formOpen) nameRef.current?.focus(); }, [formOpen]);
  function openForm() { setFormOpen(true); setFormError(null); }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const projectId = String(form.get("project_id"));
    if (!projectId) { setFormError("Selecione um projeto para a equipe."); setShake((n) => n + 1); return; }
    setSubmitting(true);
    try {
      const created = await createTeam({
        team_name: String(form.get("team_name")),
        purpose: String(form.get("purpose")) || null,
        project_id: Number(projectId),
      });
      setTeams((prev) => [created, ...prev]);
      setFormOpen(false);
      toast("Equipe criada", "success");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar equipe.");
      setShake((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-enter mx-auto grid max-w-6xl gap-6">
      <div className="ui-page-heading !mb-0">
        <div>
          <h1>Equipes</h1>
          <p>Encontre os grupos que dão vida aos projetos da comunidade.</p>
        </div>
        <button onClick={() => (formOpen ? setFormOpen(false) : openForm())} aria-expanded={formOpen} className={"ui-button " + (formOpen ? "" : "ui-button-primary")}>
          {formOpen ? "Cancelar" : "+ Nova equipe"}
        </button>
      </div>

      {formOpen && (
        <OpenPanel>
          <form onSubmit={handleCreate} className="ui-panel grid gap-4 p-5 sm:p-6" aria-label="Nova equipe">
            <label className="ui-field">Nome da equipe
              <input ref={nameRef} id="team_name" name="team_name" required maxLength={255} placeholder="Ex.: Equipe Verde" />
            </label>
            <label className="ui-field">Propósito
              <textarea id="purpose" name="purpose" rows={2} placeholder="Qual o objetivo da equipe?" />
            </label>
            <div className={"ui-field" + (formError && formError.startsWith("Selecione") ? " has-error" : "")}>
              <label htmlFor="project_id">Projeto</label>
              <select id="project_id" name="project_id" defaultValue="" required>
                <option value="" disabled>Selecione um projeto</option>
                {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
              </select>
              {projects.length === 0 && <span className="hint">Você ainda não tem projetos. <Link href="/projetos" className="font-semibold text-primary underline">Crie um projeto</Link> antes de cadastrar uma equipe.</span>}
            </div>
            {formError && <p role="alert" key={shake} className="ui-error shake">{formError}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className={"ui-button ui-button-primary" + (submitting ? " is-loading" : "")}>
                {submitting ? "Salvando..." : "Criar equipe"}
              </button>
            </div>
          </form>
        </OpenPanel>
      )}

      {loading ? (
        <ListSkeleton rows={3} label="Carregando equipes" />
      ) : loadError ? (
        <EmptyState title="Não foi possível carregar as equipes" action={<button className="ui-button ui-button-primary" onClick={() => { setLoading(true); setAttempt((n) => n + 1); }}>Tentar novamente</button>}>{loadError}</EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState title="Nenhuma equipe por aqui ainda" action={formOpen ? undefined : <button className="ui-button ui-button-primary" onClick={openForm}>+ Nova equipe</button>}>
          Monte uma equipe para reunir quem faz um projeto acontecer.
        </EmptyState>
      ) : (
        <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team, index) => (
            <Link
              key={team.team_id}
              href={`/equipe/${team.team_id}`}
              style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
              className="project-card flex flex-col gap-3 p-5"
            >
              <div className="flex items-center gap-3">
                <TeamAvatar name={team.team_name} />
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-bold text-secondary">{team.team_name}</p>
                  <p className="truncate text-[14px] text-muted">{team.project ? team.project.name : "Sem projeto"}</p>
                </div>
              </div>
              {team.purpose && <p className="line-clamp-2 text-[15px] leading-relaxed text-muted">{team.purpose}</p>}
              <div className="mt-auto flex items-center gap-2 pt-1 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5"><Users size={15} aria-hidden="true" />{team.members.length} {team.members.length === 1 ? "membro" : "membros"}</span>
                <span>· {formatDate(team.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
