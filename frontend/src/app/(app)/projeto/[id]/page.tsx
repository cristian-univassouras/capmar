"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createComment,
  deleteComment,
  deleteProject,
  getProject,
  getStoredUser,
  likeProject,
  listComments,
  listCategories,
  listTeams,
  mediaUrl,
  unlikeProject,
  updateProject,
  type Category,
  type Comment,
  type Project,
  type Team,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate } from "@/lib/format";
import { Avatar, ImagePicker } from "@/app/_components/media";

const STATUS_OPTIONS = ["rascunho", "ativo", "pausado", "concluido"] as const;
const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  ativo: "bg-emerald-100 text-emerald-700",
  pausado: "bg-amber-100 text-amber-700",
  concluido: "bg-blue-100 text-blue-700",
};

export default function ProjetoPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMe(getStoredUser());
    Promise.all([
      getProject(projectId),
      listTeams(projectId),
      listCategories(),
      listComments(projectId),
    ])
      .then(([p, t, c, cm]) => {
        setProject(p);
        setCoverUrl(p.cover_url);
        setLogoUrl(p.logo_url);
        setTeams(t);
        setCategories(c);
        setComments(cm);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  const isOwner = !!me && !!project && project.owner_id === me.user_id;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!project) return;
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const categoryId = String(form.get("category_id"));
    try {
      const updated = await updateProject(project.project_id, {
        name: String(form.get("name")),
        description: String(form.get("description")) || undefined,
        status: String(form.get("status")),
        visibility: form.get("visibility") === "on",
        category_id: categoryId ? Number(categoryId) : null,
        cover_url: coverUrl,
        logo_url: logoUrl,
      });
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project || !confirm("Excluir este projeto?")) return;
    try {
      await deleteProject(project.project_id);
      router.push("/projetos");
    } catch {
      setError("Não foi possível excluir.");
    }
  }

  async function handleLike() {
    if (!project) return;
    // otimista
    const liked = project.liked_by_me;
    setProject({
      ...project,
      liked_by_me: !liked,
      likes_count: project.likes_count + (liked ? -1 : 1),
    });
    try {
      const status = liked ? await unlikeProject(project.project_id) : await likeProject(project.project_id);
      setProject((p) => (p ? { ...p, liked_by_me: status.liked, likes_count: status.likes_count } : p));
    } catch {
      setProject((p) => (p ? { ...p, liked_by_me: liked, likes_count: project.likes_count } : p));
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !newComment.trim()) return;
    try {
      const created = await createComment(project.project_id, newComment.trim());
      setComments((prev) => [created, ...prev]);
      setNewComment("");
    } catch {
      /* silencioso */
    }
  }

  async function handleDeleteComment(id: number) {
    if (!project) return;
    const prev = comments;
    setComments((c) => c.filter((cm) => cm.comment_id !== id));
    try {
      await deleteComment(project.project_id, id);
    } catch {
      setComments(prev);
    }
  }

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500">Projeto não encontrado.</p>
        <Link href="/projetos" className="text-primary font-semibold text-sm hover:underline mt-3 inline-block">
          ← Voltar para projetos
        </Link>
      </div>
    );
  }

  const cover = mediaUrl(project.cover_url);
  const logo = mediaUrl(project.logo_url);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/projetos" className="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1">
        ← Projetos
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="h-36 bg-gradient-to-br from-secondary to-primary" />
        )}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-secondary font-black text-xl font-heading shrink-0">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="w-full h-full object-cover" />
              ) : (
                project.name.slice(0, 2).toUpperCase()
              )}
            </div>
            {!editing && (
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors"
                >
                  {copied ? "Link copiado!" : "Compartilhar"}
                </button>
                {isOwner && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capa</label>
                  <ImagePicker value={coverUrl} onChange={setCoverUrl} variant="cover" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo</label>
                  <ImagePicker value={logoUrl} onChange={setLogoUrl} variant="square" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome</label>
                <input
                  name="name"
                  defaultValue={project.name}
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                <textarea
                  name="description"
                  defaultValue={project.description ?? ""}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <select
                    name="category_id"
                    defaultValue={project.category_id ?? ""}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    name="status"
                    defaultValue={project.status}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white capitalize"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="visibility" defaultChecked={project.visibility} className="w-4 h-4 accent-primary" />
                Projeto visível publicamente
              </label>
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
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading font-black text-2xl text-foreground">{project.name}</h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {project.category?.description ?? "Sem categoria"} · Criado em {formatDate(project.created_at)}
                  </p>
                  {project.owner && (
                    <p className="text-xs text-gray-400 mt-1">por @{project.owner.username}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl capitalize ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{project.description}</p>
              )}

              {/* Interações */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-50">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                    project.liked_by_me ? "bg-accent/10 text-accent" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <svg className="w-5 h-5" fill={project.liked_by_me ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {project.likes_count}
                </button>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 px-3 py-1.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {comments.length}
                </span>
                <button
                  onClick={handleShare}
                  className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  {copied ? "Copiado!" : "Compartilhar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comentários */}
      {!editing && (
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-lg text-foreground">Comentários</h2>
          <form onSubmit={handleComment} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
            <Avatar user={me} className="w-9 h-9 text-sm" />
            <div className="flex-1 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </form>

          {comments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
              Seja o primeiro a comentar.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.comment_id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
                <Avatar user={c.author} className="w-9 h-9 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-800">{displayNameOf(c.author)}</p>
                    <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                    {(c.user_id === me?.user_id || isOwner) && (
                      <button
                        onClick={() => handleDeleteComment(c.comment_id)}
                        className="ml-auto text-gray-300 hover:text-accent text-xs"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Equipes do projeto */}
      {!editing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-foreground">Equipes</h2>
            <Link href="/equipes" className="text-sm text-primary font-semibold hover:underline">
              Gerenciar
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
              Nenhuma equipe vinculada a este projeto.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((team) => (
                <Link
                  key={team.team_id}
                  href={`/equipe/${team.team_id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-heading font-black text-xs shrink-0">
                    {team.team_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{team.team_name}</p>
                    {team.purpose && <p className="text-xs text-gray-400 truncate">{team.purpose}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
