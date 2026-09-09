"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  createTeam,
  listProjects,
  listTeams,
  type Project,
  type Team,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function EquipesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTeams(), listProjects()])
      .then(([t, p]) => {
        setTeams(t);
        setProjects(p);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const projectId = String(form.get("project_id"));
    if (!projectId) {
      setFormError("Selecione um projeto para a equipe.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTeam({
        team_name: String(form.get("team_name")),
        purpose: String(form.get("purpose")) || null,
        project_id: Number(projectId),
      });
      setTeams((prev) => [created, ...prev]);
      setFormOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar equipe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">Equipes</h1>
          <p className="text-sm text-gray-500 mt-1">Organize as equipes dos projetos.</p>
        </div>
        <button
          onClick={() => {
            setFormOpen((o) => !o);
            setFormError(null);
          }}
          className="shrink-0 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
        >
          {formOpen ? "Cancelar" : "+ Nova equipe"}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da equipe</label>
            <input
              name="team_name"
              required
              maxLength={255}
              placeholder="Ex: Equipe Verde"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Propósito</label>
            <textarea
              name="purpose"
              rows={2}
              placeholder="Qual o objetivo da equipe?"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Projeto</label>
            <select
              name="project_id"
              defaultValue=""
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="" disabled>
                Selecione um projeto
              </option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.name}
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Crie um projeto antes de cadastrar uma equipe.
              </p>
            )}
          </div>

          {formError && (
            <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{formError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Criar equipe"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-accent">{loadError}</div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Nenhuma equipe cadastrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Link
              key={team.team_id}
              href={`/equipe/${team.team_id}`}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-heading font-black shrink-0">
                  {team.team_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-base text-gray-900 truncate">{team.team_name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {team.project ? team.project.name : "Sem projeto"}
                  </p>
                </div>
              </div>
              {team.purpose && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{team.purpose}</p>
              )}
              <div className="flex items-center gap-2 mt-auto pt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {team.members.length} {team.members.length === 1 ? "membro" : "membros"}
                </span>
                <span>· {formatDate(team.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
