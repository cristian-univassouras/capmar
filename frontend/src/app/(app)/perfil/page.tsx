"use client";
/* eslint-disable @next/next/no-img-element -- Mídias autenticadas do perfil. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Pencil, ShieldCheck, FolderKanban } from "lucide-react";

import {
  getMe,
  getStoredUser,
  listPosts,
  mediaUrl,
  saveUser,
  updateUser,
  type Post,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate } from "@/lib/format";
import { Avatar, ImagePicker } from "@/app/_components/media";
import { useToast } from "@/app/_components/ui/feedback";
import { EmptyState, ListSkeleton, Skeleton } from "@/app/_components/ui/primitives";

export default function PerfilPage() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Usa o usuário guardado pela casca (sem nova chamada a /auth/me); só consulta o servidor se não houver cópia.
  useEffect(() => {
    let active = true;
    const sync = () => { const stored = getStoredUser(); if (active && stored) setUser(stored); };
    sync();
    window.addEventListener("capmar-user-changed", sync);
    if (!getStoredUser()) {
      getMe().then((u) => { if (active) saveUser(u); })
        .catch(() => { if (active) { setError("Não foi possível carregar o perfil. Tente novamente."); setLoading(false); setPostsLoading(false); } });
    }
    return () => { active = false; window.removeEventListener("capmar-user-changed", sync); };
  }, []);

  const uid = user?.user_id;
  useEffect(() => {
    if (uid == null) return;
    let active = true;
    listPosts(uid).then((p) => { if (active) setPosts(p); })
      .catch(() => { if (active) setError("Não foi possível carregar suas publicações."); })
      .finally(() => { if (active) { setLoading(false); setPostsLoading(false); } });
    return () => { active = false; };
  }, [uid]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || saving || uploading) return;
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateUser(user.user_id, {
        first_name: String(form.get("first_name")) || null,
        last_name: String(form.get("last_name")) || null,
        username: String(form.get("username")),
        email: String(form.get("email")),
        avatar_url: avatarUrl,
      });
      setUser(updated);
      saveUser(updated);
      setEditing(false);
      toast("Perfil atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !user && !error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" role="status" aria-busy="true" aria-label="Carregando perfil">
        <div className="ui-panel overflow-hidden"><Skeleton className="h-24 w-full !rounded-none" /><div className="grid gap-3 p-6"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div></div>
        <ListSkeleton rows={2} label="Carregando publicações" />
      </div>
    );
  }

  if (!user) {
    return <div role="alert" className="ui-error mx-auto max-w-4xl">{error ?? "Sessão não encontrada."}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Cartão do perfil */}
      <section aria-label="Seu perfil" className="ui-panel overflow-hidden">
        <div className="tile tile-a h-24" aria-hidden="true" />
        <div className="px-6 pb-7">
          <div className="-mt-12 mb-4 flex items-end justify-between gap-3">
            <Avatar user={user} className="h-24 w-24 border-4 border-surface text-3xl" />
            {!editing && (
              <button
                onClick={() => {
                  setAvatarUrl(user.avatar_url);
                  setEditing(true);
                  setError(null);
                }}
                className="ui-button ui-button-primary"
              >
                <Pencil size={16} aria-hidden="true" />
                Editar perfil
              </button>
            )}
          </div>

          <div key={editing ? "edit" : "view"} className="rise">
            <h1 className="font-heading text-[30px] font-extrabold leading-tight tracking-tight text-secondary">{displayNameOf(user)}</h1>
            {editing ? (
              <form onSubmit={handleSave} className="mt-5 space-y-4" aria-label="Editar perfil">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-secondary">Foto de perfil</p>
                  <ImagePicker label="Foto de perfil" value={avatarUrl} onChange={setAvatarUrl} onBusyChange={setUploading} variant="square" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="ui-field">
                    <label htmlFor="first_name">Nome</label>
                    <input id="first_name" name="first_name" defaultValue={user.first_name ?? ""} maxLength={20} />
                  </div>
                  <div className="ui-field">
                    <label htmlFor="last_name">Sobrenome</label>
                    <input id="last_name" name="last_name" defaultValue={user.last_name ?? ""} maxLength={100} />
                  </div>
                </div>
                <div className="ui-field">
                  <label htmlFor="username">Nome de usuário</label>
                  <input id="username" name="username" defaultValue={user.username} minLength={3} maxLength={20} required />
                </div>
                <div className="ui-field">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" name="email" type="email" defaultValue={user.email} maxLength={50} required />
                </div>

                {error && <p role="alert" className="ui-error shake">{error}</p>}

                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={saving || uploading} aria-busy={saving} className={"ui-button ui-button-primary " + (saving ? "is-loading" : "")}>
                    Salvar
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="ui-button ui-button-quiet">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="mt-1 text-[15px] text-muted">@{user.username} · {user.email}</p>
                <p className="mt-4 text-[15px] text-foreground"><strong className="font-heading text-lg font-extrabold text-secondary">{postsLoading ? "–" : posts.length}</strong> {posts.length === 1 ? "publicação recente" : "publicações recentes"}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link href={"/usuario/" + user.user_id} className="ui-button"><ExternalLink size={16} aria-hidden="true" />Ver perfil público</Link>
                  <Link href="/projetos" className="ui-button"><FolderKanban size={16} aria-hidden="true" />Meus projetos</Link>
                  <Link href="/seguranca" className="ui-button ui-button-quiet"><ShieldCheck size={16} aria-hidden="true" />Segurança da conta</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Publicações do usuário */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-secondary">Minhas publicações</h2>
        {error && !editing && <p role="alert" className="ui-error">{error}</p>}
        {postsLoading ? (
          <ListSkeleton rows={2} label="Carregando publicações" />
        ) : posts.length === 0 ? (
          <EmptyState title="Você ainda não publicou nada" action={<Link href="/feed" className="ui-button ui-button-primary">Escrever uma publicação</Link>}>
            Compartilhe uma novidade do seu projeto para a comunidade conhecer.
          </EmptyState>
        ) : (
          <div className="stagger grid gap-3">
            {posts.map((post, i) => (
              <article key={post.post_id} style={{ ["--i" as string]: Math.min(i, 8) }} className="ui-panel space-y-2 p-5">
                <p className="text-[13px] text-muted">{formatDate(post.created_at)}</p>
                <p className="max-w-[70ch] whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">{post.content}</p>
                {post.image_url && <img src={mediaUrl(post.image_url)} alt="Imagem da publicação" className="max-h-80 w-full rounded-xl bg-surface-2 object-contain" />}
                {post.project && <Link href={"/projeto/" + post.project.project_id} className="inline-flex min-h-11 items-center rounded-xl bg-primary-soft px-3 text-[14px] font-semibold text-primary-strong">↳ {post.project.name}</Link>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
