"use client";
import ProfileLink from "@/app/_components/ProfileLink";

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
  type Author,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate, initialsOf, tileClassFor } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import { OpenPanel } from "@/app/_components/ProjectForm";
import { EmptyState, ListSkeleton, Skeleton } from "@/app/_components/ui/primitives";
import { useConfirm, useToast } from "@/app/_components/ui/feedback";
import { ArrowLeft, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { setShellCrumb } from "@/app/(app)/AppShell";

export default function EquipePage() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [me, setMe] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  useEffect(() => { setShellCrumb(team?.team_name ?? null); return () => setShellCrumb(null); }, [team?.team_name]);
  const [users, setUsers] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addUserId, setAddUserId] = useState("");

  useEffect(() => {
    Promise.all([getTeam(teamId), listUsers()])
      .then(([t, u]) => {
        setMe(getStoredUser());
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
      toast("Equipe atualizada", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!team) return;
    const ok = await confirm({ title: "Excluir a equipe " + team.team_name + "?", message: "As pessoas deixam de fazer parte dela e o chat da equipe é encerrado. Não dá para desfazer.", confirmLabel: "Excluir equipe", danger: true });
    if (!ok) return;
    try {
      await deleteTeam(team.team_id);
      toast("Equipe excluída", "success");
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
      toast("Pessoa adicionada à equipe", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro.");
    }
  }

  async function handleRemoveMember(member: Author) {
    if (!team) return;
    const ok = await confirm({ title: "Remover " + displayNameOf(member) + " da equipe?", message: "A pessoa deixa de ver o chat e os assuntos da equipe. Você pode adicioná-la de novo depois.", confirmLabel: "Remover da equipe", danger: true });
    if (!ok) return;
    try {
      const updated = await removeTeamMember(team.team_id, member.user_id);
      setTeam(updated);
      toast("Pessoa removida da equipe", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover membro.");
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Carregando equipe" className="mx-auto grid max-w-4xl gap-6">
        <Skeleton className="h-5 w-24" />
        <div className="ui-panel overflow-hidden"><Skeleton className="h-24 w-full !rounded-none" /><div className="grid gap-3 p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3" /></div></div>
        <ListSkeleton rows={2} label="Carregando membros" />
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <EmptyState title="Equipe não encontrada" action={<Link href="/equipes" className="ui-button ui-button-primary">Voltar para equipes</Link>}>
          Ela pode ter sido excluída ou você não tem acesso.
        </EmptyState>
      </div>
    );
  }

  const tile = tileClassFor(team.team_name);
  const canChat = isLeader || team.members.some((member) => member.user_id === me?.user_id);

  return (
    <div className="page-enter mx-auto grid max-w-4xl gap-6">
      <Link href="/equipes" className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-primary">
        <ArrowLeft size={18} aria-hidden="true" />Equipes
      </Link>

      <div className="ui-panel overflow-hidden">
        <div className={`tile ${tile} h-24`} aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-9 mb-4 flex items-end justify-between gap-3">
            <div aria-hidden="true" className={`tile ${tile} flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border-4 border-surface`}>
              <span className="rounded-md bg-surface px-2 font-heading text-xl font-extrabold text-secondary">{initialsOf(team.team_name)}</span>
            </div>
            {!editing && isLeader && (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(true); setError(null); }} className="ui-button">
                  <Pencil size={16} aria-hidden="true" />Editar
                </button>
                <button onClick={handleDelete} className="ui-button ui-button-danger">
                  <Trash2 size={16} aria-hidden="true" />Excluir
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <OpenPanel>
              <form onSubmit={handleSave} className="grid gap-4" aria-label="Editar equipe">
                <label className="ui-field">Nome da equipe
                  <input id="team_name" name="team_name" defaultValue={team.team_name} required maxLength={255} autoFocus />
                </label>
                <label className="ui-field">Propósito
                  <textarea id="purpose" name="purpose" defaultValue={team.purpose ?? ""} rows={3} />
                </label>
                {error && <p role="alert" className="ui-error">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className={"ui-button ui-button-primary" + (saving ? " is-loading" : "")}>
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="ui-button ui-button-quiet">Cancelar</button>
                </div>
              </form>
            </OpenPanel>
          ) : (
            <>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-secondary">{team.team_name}</h1>
              <p className="mt-1 text-[15px] text-muted">
                {team.leader ? <>Liderada por <ProfileLink user={team.leader}>@{team.leader.username}</ProfileLink></> : "Sem líder"} · Criada em{" "}
                {formatDate(team.created_at)}
              </p>
              {team.purpose && <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-foreground">{team.purpose}</p>}
              <div className="mt-5 flex flex-wrap items-stretch gap-3">
                {canChat && <Link href={"/chat?team=" + team.team_id} className="ui-button ui-button-primary"><MessageCircle size={18} aria-hidden="true" />Chat da equipe</Link>}
                {team.project && (
                  <Link href={`/projeto/${team.project.project_id}`} className="ui-button">
                    <span className="text-muted">Projeto:</span> <span className="text-primary">{team.project.name}</span>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!editing && (
        <section className="grid gap-3" aria-labelledby="membros-titulo">
          <div className="flex items-center justify-between">
            <h2 id="membros-titulo" className="font-heading text-xl font-bold text-secondary">Membros</h2>
            <span className="text-[15px] text-muted">{team.members.length}</span>
          </div>

          {isLeader && (
            <div className="ui-panel flex flex-wrap gap-2 p-4">
              <select
                aria-label="Usuário para adicionar à equipe"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="ui-input min-w-0 flex-1"
              >
                <option value="">{addableUsers.length ? "Selecione um usuário..." : "Todos já são membros"}</option>
                {addableUsers.map((u) => <option key={u.user_id} value={u.user_id}>{displayNameOf(u)} (@{u.username})</option>)}
              </select>
              <button onClick={handleAddMember} disabled={!addUserId} className="ui-button ui-button-primary">Adicionar</button>
            </div>
          )}

          {error && <p role="alert" className="ui-error">{error}</p>}

          <ul className="ui-panel divide-y divide-line">
            {team.members.map((member) => (
              <li key={member.user_id} className="flex items-center gap-3 p-4">
                <ProfileLink user={member}><Avatar user={member} className="h-11 w-11 text-sm" /></ProfileLink>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-secondary"><ProfileLink user={member}>{displayNameOf(member)}</ProfileLink></p>
                  <p className="truncate text-[14px] text-muted"><ProfileLink user={member}>@{member.username}</ProfileLink></p>
                </div>
                {member.user_id === team.leader_id ? (
                  <span className="ui-badge is-private">Líder</span>
                ) : (
                  isLeader && (
                    <button onClick={() => handleRemoveMember(member)} className="ui-button ui-button-quiet">
                      Remover
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
