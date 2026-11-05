"use client";
import ProfileLink from "@/app/_components/ProfileLink";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  createPost,
  deletePost,
  getStoredUser,
  listPosts,
  searchProjects,
  mediaUrl,
  type Post,
  type Project,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate } from "@/lib/format";
import { Avatar, ImagePicker } from "@/app/_components/media";

export default function FeedPage() {
  const [me, setMe] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([listPosts(), searchProjects({ writable_only: true, limit: 100 })])
      .then(([p, pr]) => {
        setMe(getStoredUser());
        setPosts(p);
        setProjects(pr.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !content.trim() || posting || uploading) return;
    setError(null);
    setPosting(true);
    try {
      const created = await createPost({
        content: content.trim(),
        project_id: projectId ? Number(projectId) : null,
        image_url: imageUrl,
      });
      setPosts((prev) => [created, ...prev]);
      setContent("");
      setProjectId("");
      setImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: number) {
    if (deleting !== null) return;
    setDeleting(id);
    setError(null);
    try {
      await deletePost(id);
      setPosts((p) => p.filter((post) => post.post_id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir publicação.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6"><div className="ui-page-heading"><div><h1>Publicações</h1><p>Novidades, ideias e próximos passos dos projetos da comunidade.</p></div></div>
      {/* Criar publicação */}
      <form onSubmit={handlePublish} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
        <ProfileLink user={me}><Avatar user={me} className="w-9 h-9 text-sm" /></ProfileLink>
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            maxLength={5000}
            aria-label="Texto da publicação"
            placeholder="Compartilhe uma atualização do seu projeto..."
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />

          {imageUrl ? (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(imageUrl)} alt="" className="w-full max-h-64 object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <ImagePicker variant="compact" value={null} onChange={setImageUrl} onBusyChange={setUploading} hint="Adicione uma foto (opcional)" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Projeto da publicação"
              className="min-w-0 max-w-full text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Sem projeto vinculado</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={posting || uploading || !content.trim()}
              className="ui-button ui-button-primary ml-auto"
            >
              {posting ? "Publicando..." : uploading ? "Enviando imagem..." : "Publicar"}
            </button>
          </div>
        </div>
      </form>

      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Nenhuma publicação ainda. Seja o primeiro a publicar!
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.post_id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <ProfileLink user={post.author} userId={post.user_id}><Avatar user={post.author} className="w-10 h-10 text-sm" /></ProfileLink>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800"><ProfileLink user={post.author} userId={post.user_id}>{displayNameOf(post.author)}</ProfileLink></p>
                <p className="text-xs text-gray-400">
                  {post.author && <><ProfileLink user={post.author}>@{post.author.username}</ProfileLink>{" · "}</>}
                  {formatDate(post.created_at)}
                </p>
              </div>
              {me?.user_id === post.user_id && (
                <button
                  onClick={() => handleDelete(post.post_id)}
                  title="Excluir"
                  aria-label="Excluir publicação"
                  disabled={deleting !== null}
                  className="text-gray-500 hover:text-accent transition-colors p-3 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>

            <p className="break-words text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {post.image_url && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(post.image_url)} alt="Imagem da publicação" className="w-full max-h-96 object-contain bg-gray-50" />
              </div>
            )}

            {post.project && (
              <Link
                href={`/projeto/${post.project.project_id}`}
                className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 bg-gray-50 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-black text-xs shrink-0">
                  {post.project.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Projeto</p>
                  <p className="font-semibold text-sm text-primary">{post.project.name}</p>
                </div>
              </Link>
            )}
          </div>
        ))
      )}
    </div>
  );
}
