"use client";
import ProfileLink from "@/app/_components/ProfileLink";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";

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
import { useConfirm, useToast } from "@/app/_components/ui/feedback";
import { EmptyState, ListSkeleton } from "@/app/_components/ui/primitives";
import FeedSidebar from "./FeedSidebar";

export default function FeedPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [me, setMe] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const expanded = focused || posting || posted || uploading || content.length > 0 || imageUrl !== null;

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

  // Recolhe só ao clicar fora ou ao tabular para outro elemento. Abrir o seletor de arquivos tira o foco
  // da página (relatedTarget nulo) e não pode recolher o formulário, senão a imagem escolhida se perde.
  useEffect(() => {
    if (!focused) return;
    const outside = (event: PointerEvent) => { if (!form.current?.contains(event.target as Node)) setFocused(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [focused]);

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
      setFocused(false);
      setPosted(true);
      window.setTimeout(() => setPosted(false), 1400);
      toast("Publicação enviada.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao publicar.";
      setError(message);
      toast(message, "error");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: number) {
    if (deleting !== null) return;
    const ok = await confirm({
      title: "Excluir esta publicação?",
      message: "Ela some do seu perfil e da comunidade. Não dá para desfazer.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    setError(null);
    try {
      await deletePost(id);
      setPosts((p) => p.filter((post) => post.post_id !== id));
      toast("Publicação excluída.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir publicação.";
      setError(message);
      toast(message, "error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div className="min-w-0 space-y-6">
      <div className="ui-page-heading"><div><h1>Publicações</h1><p>Novidades, ideias e próximos passos dos projetos da comunidade.</p></div></div>
      {/* Criar publicação: compacto até receber foco */}
      <form
        ref={form}
        onSubmit={handlePublish}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { const next = e.relatedTarget as Node | null; if (next && !e.currentTarget.contains(next)) setFocused(false); }}
        className="ui-panel flex gap-3 p-4"
      >
        <ProfileLink user={me}><Avatar user={me} className="h-10 w-10 text-sm" /></ProfileLink>
        <div className="min-w-0 flex-1">
          <textarea
            ref={textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={expanded ? 3 : 1}
            maxLength={5000}
            aria-label="Texto da publicação"
            placeholder="Conte uma novidade..."
            className="ui-input resize-none"
            style={{ minHeight: expanded ? 96 : 46 }}
          />

          {expanded && (
            <div className="rise">
              {imageUrl && (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(imageUrl)} alt="Prévia da imagem da publicação" className="max-h-64 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    aria-label="Remover imagem da publicação"
                    className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary/75 text-white hover:bg-secondary"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!imageUrl && <ImagePicker variant="compact" value={null} onChange={setImageUrl} onBusyChange={setUploading} hint="Adicione uma foto (opcional)" />}
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  aria-label="Projeto da publicação"
                  className="ui-input"
                  style={{ width: "auto", maxWidth: "100%", fontSize: 14 }}
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
                  aria-busy={posting}
                  className={"ui-button ui-button-primary ml-auto " + (posting ? "is-loading" : posted ? "is-done" : "")}
                >
                  {uploading ? "Enviando imagem..." : posted ? "Publicado" : "Publicar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>

      {error && <div role="alert" className="ui-error">{error}</div>}
      {/* Lista */}
      {loading ? (
        <ListSkeleton rows={3} label="Carregando publicações" />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Ainda não há publicações"
          action={<button type="button" className="ui-button ui-button-primary" onClick={() => textarea.current?.focus()}>Escrever a primeira</button>}
        >
          Conte uma novidade, um passo concluído ou uma ajuda que você procura. É assim que a comunidade conhece seu projeto.
        </EmptyState>
      ) : (
        <div className="stagger grid gap-4">
          {posts.map((post, i) => (
            <article key={post.post_id} style={{ ["--i" as string]: Math.min(i, 8) }} className="ui-panel space-y-4 p-5">
              <div className="flex items-center gap-3">
                <ProfileLink user={post.author} userId={post.user_id}><Avatar user={post.author} className="h-11 w-11 text-sm" /></ProfileLink>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                  <ProfileLink user={post.author} userId={post.user_id} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-secondary">{displayNameOf(post.author)}</ProfileLink>
                  {post.author && <ProfileLink user={post.author} className="inline-flex min-h-11 items-center text-[13px] text-muted">@{post.author.username}</ProfileLink>}
                  <span className="text-[13px] text-muted">· {formatDate(post.created_at)}</span>
                </div>
                {me?.user_id === post.user_id && (
                  <button
                    onClick={() => handleDelete(post.post_id)}
                    aria-label="Excluir publicação"
                    disabled={deleting !== null}
                    className="ui-button ui-button-quiet !px-3 !text-[14px] !text-muted hover:!bg-danger-soft hover:!text-danger"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>

              <p className="max-w-[70ch] whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">{post.content}</p>

              {post.image_url && (
                <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(post.image_url)} alt="Imagem da publicação" className="max-h-80 w-full object-contain" />
                </div>
              )}

              {post.project && (
                <Link
                  href={`/projeto/${post.project.project_id}`}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-primary hover:bg-primary-soft"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-heading text-[13px] font-extrabold text-primary-strong">
                    {post.project.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-muted">Projeto</p>
                    <p className="truncate text-[15px] font-semibold text-primary-strong">{post.project.name}</p>
                  </div>
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
    <FeedSidebar me={me} posts={posts.length} />
    </div>
  );
}
