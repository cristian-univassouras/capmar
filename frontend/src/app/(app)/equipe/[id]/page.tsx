"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  addTeamMember,
  deleteTeam,
  getStoredUser,
  getTeam,
  listUsers,
  removeTeamMember,
  updateTeam,
  type Team,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate } from "@/lib/format";
import { Avatar } from "@/app/_components/media";

export default function EquipePage() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addUserId, setAddUserId] = useState("");

  useEffect(() => {
    setMe(getStoredUser());
    Promise.all([getTeam(teamId), listUsers()])
      .then(([t, u]) => {
        setTeam(t);
        setUsers(u);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [teamId]);

  const isLeader = !!me && !!team && team.leader_id === me.user_id;

  const addableUsers = useMemo(() => {
    if (!team) return [];
    const ids = new Set(team.members.map((m) => m.user_id));
    return users.filter((u) => !ids.has(u.user_id));
  }, [team, users]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!team) return;
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateTeam(team.team_id, {
        team_name: String(form.get("team_name")),
        purpose: String(form.get("purpose")) || null,
      });
      setTeam(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!team || !confirm("Excluir esta equipe?")) return;
    try {
      await deleteTeam(team.team_id);
      router.push("/equipes");
    } catch {
      setError("Não foi possível excluir.");
    }
  }

  async function handleAddMember() {
    if (!team || !addUserId) return;
    try {
      const updated = await addTeamMember(team.team_id, Number(addUserId));
      setTeam(updated);
      setAddUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro.");
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!team) return;
    try {
      const updated = await removeTeamMember(team.team_id, userId);
      setTeam(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover membro.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500">Equipe não encontrada.</p>
        <Link href="/equipes" className="text-primary font-semibold text-sm hover:underline mt-3 inline-block">
          ← Voltar para equipes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/equipes" className="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1">
        ← Equipes
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-accent/80 to-primary" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-accent font-black text-xl font-heading shrink-0">
              {team.team_name.slice(0, 2).toUpperCase()}
            </div>
            {!editing && isLeader && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(true);
                    setError(null);
                  }}
                  className="border border-primary text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="border border-gray-200 text-gray-500 text-sm font-semibold px-4 py-2 rounded-xl hover:border-accent hover:text-accent transition-colors"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da equipe</label>
                <input
                  name="team_name"
                  defaultValue={team.team_name}
                  required
                  maxLength={255}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Propósito</label>
                <textarea
                  name="purpose"
                  defaultValue={team.purpose ?? ""}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              {error && <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm font-semibold text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="font-heading font-black text-2xl text-foreground">{team.team_name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {team.leader ? `Liderada por @${team.leader.username}` : "Sem líder"} · Criada em{" "}
                {formatDate(team.created_at)}
              </p>
              {team.purpose && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{team.purpose}</p>}

              {team.project && (
                <Link
                  href={`/projeto/${team.project.project_id}`}
                  className="mt-5 border border-gray-100 rounded-xl p-3 flex items-center gap-3 bg-gray-50 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-black text-xs shrink-0">
                    {team.project.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Projeto vinculado</p>
                    <p className="font-semibold text-sm text-primary">{team.project.name}</p>
                  </div>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Membros */}
      {!editing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-foreground">Membros</h2>
            <span className="text-sm text-gray-400">{team.members.length}</span>
          </div>

          {/* Adicionar membro (líder) */}
          {isLeader && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-2">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white text-sm"
              >
                <option value="">
                  {addableUsers.length ? "Selecione um usuário..." : "Todos já são membros"}
                </option>
                {addableUsers.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {displayNameOf(u)} (@{u.username})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addUserId}
                className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          )}

          {error && !editing && (
            <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{error}</p>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {team.members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3 p-4">
                <Avatar user={member} className="w-10 h-10 text-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{displayNameOf(member)}</p>
                  <p className="text-xs text-gray-400 truncate">@{member.username}</p>
                </div>
                {member.user_id === team.leader_id ? (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                    Líder
                  </span>
                ) : (
                  isLeader && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-xs font-semibold text-gray-400 hover:text-accent px-3 py-1 rounded-full hover:bg-accent/5 transition-colors"
                    >
                      Remover
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
