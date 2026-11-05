"use client";
import ProfileLink from "@/app/_components/ProfileLink";
/* eslint-disable @next/next/no-img-element -- A entrega das mídias verifica o cookie do navegador. */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError, createComment, deleteComment, deleteProject, getProject, getOptionalMe,
  likeProject, listComments, listCategories, listTeams, mediaUrl, unlikeProject, updateProject,
  type Category, type Comment, type Project, type Team, type User,
} from "@/lib/api";
import { displayNameOf, formatDate } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import PublicFrame from "@/app/_components/PublicFrame";
import ProjectForm from "@/app/_components/ProjectForm";
import ProjectShare from "@/app/_components/ProjectShare";
import { ProjectMaterials, brandColors } from "@/app/_components/ProjectPresentation";
import { useSessionRevision } from "@/lib/use-session-revision";

export default function ProjetoClient({ initialProject }: { initialProject: Project | null }) {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(initialProject);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attempt, setAttempt] = useState(0);
  const sessionRevision = useSessionRevision();
  const [resolved, setResolved] = useState(initialProject ? projectId + ":0" : "");
  const requestKey = projectId + ":" + attempt + (sessionRevision ? ":session:" + sessionRevision : "");
  const loading = resolved !== requestKey;
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getProject(projectId), listTeams(projectId), listCategories(), listComments(projectId), getOptionalMe()])
      .then(([p, t, c, cm, user]) => {
        if (!active) return;
        setProject(p); setTeams(t); setCategories(c); setComments(cm); setMe(user);
        setNotFound(false); setError(""); setEditing(false);
      })
      .catch((err) => {
        if (!active) return;
        setProject(null);
        setNotFound(err instanceof ApiError && err.status === 404);
        setError(err.message || "Não foi possível carregar o projeto.");
      })
      .finally(() => { if (active) setResolved(requestKey); });
    return () => { active = false; };
  }, [projectId, attempt, requestKey]);
  const owner = Boolean(me && project && me.user_id === project.owner_id);
  const loginPath = "/login?next=" + encodeURIComponent("/projeto/" + projectId);
  async function removeProject() {
    if (!project || busy || !confirm("Excluir este projeto e seus comentários, equipes e publicações?")) return;
    setBusy("delete"); setError("");
    try { await deleteProject(projectId); router.push("/projetos"); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir."); }
    finally { setBusy(""); }
  }
  async function toggleLike() {
    if (!me) { router.push(loginPath); return; }
    if (!project || busy) return;
    setBusy("like"); setError("");
    try {
      const result = project.liked_by_me ? await unlikeProject(projectId) : await likeProject(projectId);
      setProject((current) => current && ({ ...current, likes_count: result.likes_count, liked_by_me: result.liked }));
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao curtir."); }
    finally { setBusy(""); }
  }
  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!newComment.trim() || busy) return;
    setBusy("comment"); setError("");
    try {
      const created = await createComment(projectId, newComment.trim());
      setComments((current) => [created, ...current]); setNewComment("");
      setProject((current) => current && ({ ...current, comments_count: current.comments_count + 1 }));
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao comentar."); }
    finally { setBusy(""); }
  }
  async function removeComment(id: number) {
    if (busy) return;
    setBusy("comment"); setError("");
    try {
      await deleteComment(projectId, id);
      setComments((current) => current.filter((comment) => comment.comment_id !== id));
      setProject((current) => current && ({ ...current, comments_count: current.comments_count - 1 }));
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir comentário."); }
    finally { setBusy(""); }
  }
  async function moreComments() {
    setBusy("more"); setError("");
    try { const next = await listComments(projectId, comments.length); setComments((current) => [...current, ...next]); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar comentários."); }
    finally { setBusy(""); }
  }
  return <PublicFrame className="max-w-5xl">
    <Link href={me ? "/projetos" : "/home"} className="inline-block text-sm font-semibold text-primary">← Voltar para projetos</Link>
    {loading ? <p role="status" className="py-16 text-center">Carregando projeto...</p> : !project ? <div className="space-y-4 rounded-2xl bg-white p-8 text-center">
      <h1 className="text-2xl font-bold">{notFound ? "Projeto não encontrado ou sem acesso" : "Não foi possível carregar o projeto"}</h1>
      <p>{notFound ? "Projetos privados só podem ser vistos pelas pessoas autorizadas." : error}</p>
      {notFound ? <Link href={loginPath} className="inline-block rounded-xl bg-primary px-5 py-3 text-white">Entrar com outra conta</Link> : <button onClick={() => setAttempt((n) => n + 1)} className="underline">Tentar novamente</button>}
    </div> : <>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <section className={"overflow-hidden rounded-2xl border bg-white " + (project.template === "criativo" ? "text-center" : "")} style={{ borderColor: brandColors[project.accent] ?? brandColors.roxo, borderTopWidth: project.template === "minimalista" ? 2 : 6 }}>
        {project.cover_url ? <img src={mediaUrl(project.cover_url)} alt={"Capa de " + project.name} className={project.template === "minimalista" ? "h-24 w-full object-cover" : project.template === "criativo" ? "h-56 w-full object-cover sm:h-72" : "h-40 w-full object-cover sm:h-56"} /> : <div className="h-3 bg-gradient-to-r from-primary via-secondary to-accent/70" />}
        <div className="space-y-4 p-4 sm:p-6">
          {project.logo_url && <img src={mediaUrl(project.logo_url)} alt={"Logo de " + project.name} className="h-14 w-14 rounded-xl border border-gray-100 object-cover"/>}
          <h1 className="break-words font-heading text-3xl font-black" style={{ color: brandColors[project.accent] ?? brandColors.roxo }}>{project.name}</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{project.authorship === "group" ? "Projeto em grupo" : "Projeto individual"}</p>
          {project.responsible_names && <p className="break-words text-xs text-gray-500">Responsáveis: {project.responsible_names}</p>}

          <p className="text-sm text-gray-600">{project.category?.description ?? "Sem categoria"} · {project.status} · {project.visibility ? "Público" : "Privado"} · {formatDate(project.created_at)}</p>
          {project.owner && <Link href={"/usuario/" + project.owner.user_id} className="inline-flex items-center gap-2 text-sm text-primary"><Avatar user={project.owner} className="h-8 w-8" />{displayNameOf(project.owner)} · @{project.owner.username}</Link>}
          <p className="whitespace-pre-wrap break-words text-gray-700">{project.description || "Este projeto ainda não tem uma descrição."}</p>
          <div className="flex flex-wrap gap-2">{project.keywords.map((tag) => <Link href={"/home?q=" + encodeURIComponent(tag.word)} key={tag.keyword_id} className="break-all rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">#{tag.word}</Link>)}</div>
          {project.funding_url && <aside className="space-y-2 rounded-xl bg-primary/5 p-4"><h2 className="font-semibold">Apoie este projeto</h2><p className="break-words text-sm">{project.funding_description || "Conheça a iniciativa de apoio dos responsáveis."}</p><a href={project.funding_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-block py-2 font-semibold text-primary underline">Abrir página de apoio ↗</a><p className="text-xs text-gray-600">Você será direcionado a uma página externa.</p></aside>}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              <ProjectShare id={projectId} name={project.name} visible={project.visibility} />
              {owner && !editing && <><button onClick={() => setEditing(true)} className="rounded-xl border border-primary px-4 py-3 text-primary">Editar projeto</button><button disabled={Boolean(busy)} onClick={removeProject} className="rounded-lg px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === "delete" ? "Excluindo..." : "Excluir projeto"}</button></>}
            </div>

          {!editing && <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
            <button disabled={Boolean(busy)} aria-pressed={project.liked_by_me} onClick={toggleLike} className="rounded-xl border border-gray-300 px-4 py-3 text-primary disabled:opacity-50">{project.liked_by_me ? "Descurtir" : "Curtir"} · {project.likes_count}</button>
            <span className="text-sm text-gray-600">{project.comments_count} comentários</span>
          </div>}
        </div>
      </section>
      {editing && owner ? <ProjectForm key={project.project_id} project={project} categories={categories} onCancel={() => setEditing(false)} onSave={async (payload) => {
        const updated = await updateProject(projectId, payload); setProject(updated); setEditing(false); setError("");
      }} /> : <>
        <nav aria-label="Seções do projeto" className="flex gap-5 overflow-x-auto border-b border-gray-200 py-3 text-sm font-semibold text-primary"><a href="#materiais">Materiais</a><a href="#comentarios">Comentários</a><a href="#equipe">Equipe</a></nav><div id="materiais" className="scroll-mt-24"><ProjectMaterials project={project}/></div>
        <section id="comentarios" className="scroll-mt-24 space-y-4"><h2 className="font-heading text-xl font-bold">Comentários</h2>
          {me ? <form onSubmit={sendComment} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <label className="block text-sm font-semibold">Seu comentário<textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} maxLength={5000} required rows={3} className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
            <button disabled={Boolean(busy) || !newComment.trim()} className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{busy === "comment" ? "Aguarde..." : "Enviar comentário"}</button>
          </form> : <p className="rounded-xl bg-white p-4 text-sm"><Link href={loginPath} className="font-semibold text-primary underline">Entre</Link> ou <Link href={"/register?next=" + encodeURIComponent("/projeto/" + projectId)} className="font-semibold text-primary underline">crie uma conta</Link> para comentar e curtir.</p>}
          {comments.length === 0 && <p className="text-sm text-gray-600">Ainda não há comentários.</p>}
          {comments.map((comment) => <article key={comment.comment_id} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <ProfileLink user={comment.author} userId={comment.user_id} className="shrink-0"><Avatar user={comment.author} className="h-9 w-9 shrink-0" /></ProfileLink>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3">
              <Link href={"/usuario/" + comment.user_id} className="break-words font-semibold">{displayNameOf(comment.author)}</Link>
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
              {(owner || me?.user_id === comment.user_id) && <button disabled={Boolean(busy)} onClick={() => removeComment(comment.comment_id)} className="ml-auto px-2 py-2 text-sm text-red-700">Excluir comentário</button>}
            </div><p className="mt-2 whitespace-pre-wrap break-words text-gray-700">{comment.content}</p></div>
          </article>)}
          {comments.length < project.comments_count && <button disabled={Boolean(busy)} onClick={moreComments} className="rounded-xl border border-gray-300 px-5 py-3">Carregar mais comentários</button>}
        </section>
        <section id="equipe" className="scroll-mt-24 space-y-4"><h2 className="font-heading text-xl font-bold">Equipes</h2>
          {teams.length === 0 && <p className="text-sm text-gray-600">Nenhuma equipe vinculada.</p>}
          <div className="grid gap-4 sm:grid-cols-2">{teams.map((team) => <article key={team.team_id} className="min-w-0 space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="break-words font-bold">{team.team_name}</h3><p className="break-words text-sm text-gray-600">{team.purpose}</p>
            <p className="text-sm">Liderança: <ProfileLink user={team.leader}>{displayNameOf(team.leader)}</ProfileLink></p><p className="text-sm">{team.members.length} integrante(s)</p>
            {me && <Link href={"/equipe/" + team.team_id} className="inline-block py-2 text-sm font-semibold text-primary">Ver equipe</Link>}
          </article>)}</div>
        </section>
      </>}
    </>}
  </PublicFrame>;
}
