"use client";
import ProfileLink from "@/app/_components/ProfileLink";
/* eslint-disable @next/next/no-img-element -- A entrega das mídias verifica o cookie do navegador. */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ExternalLink, Heart, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  ApiError, createComment, deleteComment, deleteProject, getProject, getOptionalMe,
  likeProject, listComments, listCategories, listTeams, mediaUrl, unlikeProject, updateProject,
  type Category, type Comment, type Project, type Team, type User,
} from "@/lib/api";
import { createDirectConversation } from "@/lib/engagement";
import { displayNameOf, formatDate, statusBadgeClass, statusLabel } from "@/lib/format";
import { Avatar } from "@/app/_components/media";
import PublicFrame from "@/app/_components/PublicFrame";
import ProjectForm from "@/app/_components/ProjectForm";
import ProjectShare from "@/app/_components/ProjectShare";
import { ProjectMaterials, brandColors } from "@/app/_components/ProjectPresentation";
import { useConfirm, useToast } from "@/app/_components/ui/feedback";
import { EmptyState, Skeleton, TileCover } from "@/app/_components/ui/primitives";
import { useSessionRevision } from "@/lib/use-session-revision";
import { setShellCrumb } from "@/app/(app)/AppShell";

const TABS = [
  { id: "materiais", label: "Materiais" },
  { id: "comentarios", label: "Comentários" },
  { id: "equipe", label: "Equipe" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
/** Aba ativa guardada no hash da URL (#materiais, #comentarios, #equipe). */
function useHashTab(): [TabId, (id: TabId) => void] {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const tab = (TABS.find((t) => t.id === hash)?.id ?? "materiais") as TabId;
  const select = useCallback((id: TabId) => {
    window.history.replaceState(null, "", "#" + id);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return [tab, select];
}

function ProjectTabs({ tab, onSelect, counts }: { tab: TabId; onSelect: (id: TabId) => void; counts: Record<TabId, number | null> }) {
  const list = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  const measure = useCallback(() => {
    const active = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active) setBar({ x: active.offsetLeft, w: active.offsetWidth });
  }, []);
  useLayoutEffect(() => { measure(); }, [tab, counts, measure]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true));
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [measure]);
  function onKeyDown(event: React.KeyboardEvent) {
    const index = TABS.findIndex((t) => t.id === tab);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(TABS[next].id);
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }
  return <div ref={list} role="tablist" aria-label="Seções do projeto" onKeyDown={onKeyDown} className="relative flex overflow-x-auto border-b border-line [scrollbar-width:none]">
    {TABS.map((t) => <button key={t.id} id={"aba-" + t.id} role="tab" type="button" aria-selected={tab === t.id} aria-controls={"painel-" + t.id} tabIndex={tab === t.id ? 0 : -1}
      onClick={() => onSelect(t.id)} className="ui-tab shrink-0 gap-2" style={{ borderBottomColor: "transparent", paddingInline: 12 }}>
      {t.label}{counts[t.id] !== null && <span className="rounded-md bg-surface-2 px-1.5 text-[13px] font-semibold text-muted">{counts[t.id]}</span>}
    </button>)}
    {bar && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-px origin-left bg-primary"
      style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})`, transition: animate ? "transform 260ms var(--ease-out)" : "none" }} />}
  </div>;
}

function ManageMenu({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  function close(refocus = true) { setOpen(false); if (refocus) trigger.current?.focus(); }
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  }
  return <div ref={root} className="relative" onKeyDown={onKeyDown}>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((v) => !v)} className="ui-button">
      <MoreHorizontal size={18} aria-hidden="true" />Gerenciar
    </button>
    {open && <div role="menu" aria-label="Gerenciar projeto" className="absolute right-0 top-full z-20 mt-2 grid w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-lg" style={{ animation: "rise var(--dur-fast) var(--ease-out) both" }}>
      <button role="menuitem" type="button" onClick={() => { close(false); onEdit(); }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-secondary hover:bg-surface-2"><Pencil size={18} aria-hidden="true" />Editar projeto</button>
      <div role="separator" className="my-3 border-t border-line" />
      <button role="menuitem" type="button" onClick={() => { close(false); onDelete(); }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-danger hover:bg-danger-soft"><Trash2 size={18} aria-hidden="true" />Excluir projeto</button>
    </div>}
  </div>;
}

function ProjectSkeleton() {
  return <div role="status" aria-busy="true" aria-label="Carregando projeto" className="ui-panel overflow-hidden">
    <Skeleton className="aspect-[16/5] w-full !rounded-none" />
    <div className="grid gap-4 p-5 sm:p-7">
      <Skeleton className="h-9 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-10 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
    </div>
  </div>;
}

export default function ProjetoClient({ initialProject }: { initialProject: Project | null }) {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, selectTab] = useHashTab();
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
  const [likeTouched, setLikeTouched] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getProject(projectId), listTeams(projectId), listCategories(), listComments(projectId), getOptionalMe()])
      .then(([p, t, c, cm, user]) => {
        if (!active) return;
        setProject(p); setTeams(t); setCategories(c); setComments(cm); setMe(user);
        setNotFound(false); setError("");
        setEditing(Boolean(user && p.owner_id === user.user_id && new URLSearchParams(window.location.search).has("editar")));
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

  // O título da aba acompanha o projeto, inclusive para o dono de um projeto privado.
  useEffect(() => { if (project) document.title = project.name + " | CapMar"; }, [project]);
  useEffect(() => { setShellCrumb(project?.name ?? null); return () => setShellCrumb(null); }, [project?.name]);

  const owner = Boolean(me && project && me.user_id === project.owner_id);
  const loginPath = "/login?next=" + encodeURIComponent("/projeto/" + projectId);
  const accentColor = project ? brandColors[project.accent] ?? brandColors.roxo : brandColors.roxo;

  async function removeProject() {
    if (!project || busy) return;
    const ok = await confirm({
      title: "Excluir este projeto?",
      message: "Os comentários, equipes e publicações ligados a ele também serão excluídos. Não dá para desfazer.",
      confirmLabel: "Excluir projeto", danger: true,
    });
    if (!ok) return;
    setBusy("delete"); setError("");
    try { await deleteProject(projectId); toast("Projeto excluído", "success"); router.push("/projetos"); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir."); }
    finally { setBusy(""); }
  }
  async function toggleLike() {
    if (!me) { router.push(loginPath); return; }
    if (!project || busy) return;
    setBusy("like"); setError(""); setLikeTouched(true);
    try {
      const result = project.liked_by_me ? await unlikeProject(projectId) : await likeProject(projectId);
      setProject((current) => current && ({ ...current, likes_count: result.likes_count, liked_by_me: result.liked }));
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao curtir."); }
    finally { setBusy(""); }
  }
  async function startChat() {
    if (!project?.owner) return;
    if (!me) { router.push(loginPath); return; }
    setBusy("chat"); setError("");
    try {
      const room = await createDirectConversation(project.owner.user_id);
      router.push("/chat?conversation=" + room.conversation_id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.push(loginPath);
      else setError(err instanceof Error ? err.message : "Não foi possível iniciar a conversa.");
      setBusy("");
    }
  }
  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!newComment.trim() || busy) return;
    setBusy("comment"); setError("");
    try {
      const created = await createComment(projectId, newComment.trim());
      setComments((current) => [created, ...current]); setNewComment("");
      setProject((current) => current && ({ ...current, comments_count: current.comments_count + 1 }));
      toast("Comentário enviado", "success");
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao comentar."); }
    finally { setBusy(""); }
  }
  async function removeComment(id: number) {
    if (busy) return;
    const ok = await confirm({ title: "Excluir este comentário?", message: "Ele deixa de aparecer no projeto.", confirmLabel: "Excluir comentário", danger: true });
    if (!ok) return;
    setBusy("comment"); setError("");
    try {
      await deleteComment(projectId, id);
      setComments((current) => current.filter((comment) => comment.comment_id !== id));
      setProject((current) => current && ({ ...current, comments_count: current.comments_count - 1 }));
      toast("Comentário excluído", "success");
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir comentário."); }
    finally { setBusy(""); }
  }
  async function moreComments() {
    setBusy("more"); setError("");
    try { const next = await listComments(projectId, comments.length); setComments((current) => [...current, ...next]); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar comentários."); }
    finally { setBusy(""); }
  }

  const hasFunding = Boolean(project?.funding_url);
  const canMessage = Boolean(project?.owner) && !owner;
  const hasMaterials = Boolean(project && (project.portfolio?.length || project.partners?.length));

  return <PublicFrame className="max-w-5xl">
    <Link href={me ? "/projetos" : "/home"} className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-primary"><ArrowLeft size={18} aria-hidden="true" />Voltar para projetos</Link>
    {loading ? <ProjectSkeleton /> : !project ? <EmptyState
      title={notFound ? "Projeto não encontrado ou sem acesso" : "Não foi possível carregar o projeto"}
      action={notFound
        ? <div className="flex flex-wrap justify-center gap-3">{!me && <Link href={loginPath} className="ui-button ui-button-primary">Entrar com outra conta</Link>}<Link href={me ? "/projetos" : "/home"} className="ui-button">Ver outros projetos</Link></div>
        : <button onClick={() => setAttempt((n) => n + 1)} className="ui-button ui-button-primary">Tentar novamente</button>}>
      {notFound ? "Projetos privados só podem ser vistos pelas pessoas autorizadas." : error}
    </EmptyState> : <div className="page-enter grid gap-6">
      {error && <p role="alert" className="ui-error">{error}</p>}
      <section className="ui-panel">
        <div className={"w-full overflow-hidden rounded-t-[15px] " + (project.template === "minimalista" || !project.cover_url ? "aspect-[16/6] sm:aspect-[16/4]" : "aspect-[16/6] sm:aspect-[16/5]")}>
          {project.cover_url
            ? <img src={mediaUrl(project.cover_url)} alt={"Capa de " + project.name} className="h-full w-full object-cover" />
            : <TileCover seed={project.category?.description ?? project.name} label={project.name} />}
        </div>
        <div className="grid gap-4 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            {project.logo_url && <img src={mediaUrl(project.logo_url)} alt={"Logo de " + project.name} className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover" />}
            <h1 className="min-w-0 break-words font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" style={{ color: accentColor }}>{project.name}</h1>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted">
            <span>{project.category?.description ?? "Sem categoria"}</span>
            <span className={statusBadgeClass(project.status)}>{statusLabel(project.status)}</span>
            <span className={"ui-badge " + (project.visibility ? "is-public" : "is-private")}>{project.visibility ? "Público" : "Privado"}</span>
            <span>{formatDate(project.created_at)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {project.owner && <Link href={"/usuario/" + project.owner.user_id} className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-secondary hover:text-primary"><Avatar user={project.owner} className="h-9 w-9 text-sm" />{displayNameOf(project.owner)}<span className="font-normal text-muted">@{project.owner.username}</span></Link>}
            <span className="text-[15px] text-muted">{project.authorship === "group" ? "Projeto em grupo" : "Projeto individual"}</span>
          </div>
          {project.responsible_names && <p className="break-words text-[15px] text-muted">Responsáveis: {project.responsible_names}</p>}
          <p className="max-w-[70ch] whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">{project.description || "Este projeto ainda não tem uma descrição."}</p>
          {project.keywords.length > 0 && <div className="flex flex-wrap gap-2">{project.keywords.map((tag) => <Link href={"/home?q=" + encodeURIComponent(tag.word)} key={tag.keyword_id} className="inline-flex min-h-11 max-w-full items-center rounded-lg bg-primary-soft px-3 text-[14px] font-semibold text-primary-strong">#{tag.word}</Link>)}</div>}

          {!editing && <div className="grid gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-center gap-3">
              {hasFunding && <a href={project.funding_url!} target="_blank" rel="noopener noreferrer nofollow ugc" className="ui-button ui-button-accent"><ExternalLink size={18} aria-hidden="true" />Apoiar este projeto</a>}
              {canMessage && <button type="button" disabled={Boolean(busy)} onClick={startChat} className={"ui-button " + (hasFunding ? "" : "ui-button-primary")}><MessageCircle size={18} aria-hidden="true" />Enviar mensagem</button>}
              <button type="button" disabled={Boolean(busy)} aria-pressed={project.liked_by_me} onClick={toggleLike} className="ui-button">
                <Heart key={String(project.liked_by_me)} size={18} aria-hidden="true" fill={project.liked_by_me ? "currentColor" : "none"} className={(project.liked_by_me ? "text-accent " : "") + (likeTouched && project.liked_by_me ? "pop" : "")} />
                {project.liked_by_me ? "Descurtir" : "Curtir"}<span key={project.likes_count} className={"tabular-nums " + (likeTouched ? "number-in" : "")}>{project.likes_count}</span>
              </button>
              <ProjectShare id={projectId} name={project.name} visible={project.visibility} />
              {owner && <ManageMenu disabled={Boolean(busy)} onEdit={() => setEditing(true)} onDelete={removeProject} />}
            </div>
            {hasFunding && <p className="max-w-[70ch] break-words text-[14px] text-muted">{project.funding_description && <span className="block text-foreground">{project.funding_description}</span>}O apoio acontece em uma página externa, fora do CapMar.</p>}
          </div>}
        </div>
      </section>

      {editing && owner ? <ProjectForm key={project.project_id} project={project} categories={categories} onCancel={() => setEditing(false)} onSave={async (payload) => {
        const updated = await updateProject(projectId, payload); setProject(updated); setEditing(false); setError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }} /> : <div className="grid gap-5">
        <ProjectTabs tab={tab} onSelect={selectTab} counts={{ materiais: null, comentarios: project.comments_count, equipe: teams.length }} />
        <div key={tab} role="tabpanel" id={"painel-" + tab} aria-labelledby={"aba-" + tab} tabIndex={0} className="page-enter grid gap-4 outline-offset-4">
          {tab === "materiais" && (hasMaterials ? <ProjectMaterials project={project} /> : <EmptyState title="Ainda sem materiais"
            action={owner ? <button onClick={() => setEditing(true)} className="ui-button ui-button-primary">Editar projeto</button> : undefined}>
            {owner ? "Adicione imagens, PDFs ou vídeos para contar a história do projeto." : "Quem faz este projeto ainda não publicou materiais."}
          </EmptyState>)}

          {tab === "comentarios" && <>
            {me ? <form onSubmit={sendComment} className="ui-panel grid gap-3 p-4 sm:p-5">
              <label className="ui-field">Seu comentário<textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} maxLength={5000} required rows={3} placeholder="Escreva uma mensagem de incentivo ou uma pergunta" /></label>
              <div><button disabled={Boolean(busy) || !newComment.trim()} className={"ui-button ui-button-primary" + (busy === "comment" ? " is-loading" : "")}>{busy === "comment" ? "Aguarde..." : "Enviar comentário"}</button></div>
            </form> : <p className="ui-notice"><Link href={loginPath} className="font-semibold underline">Entre</Link> ou <Link href={"/register?next=" + encodeURIComponent("/projeto/" + projectId)} className="font-semibold underline">crie uma conta</Link> para comentar e curtir.</p>}
            {comments.length === 0 && <p className="py-4 text-center text-[15px] text-muted">Ainda não há comentários. Seja a primeira pessoa a comentar.</p>}
            {comments.map((comment) => <article key={comment.comment_id} className="ui-panel flex gap-3 p-4">
              <ProfileLink user={comment.author} userId={comment.user_id} className="shrink-0"><Avatar user={comment.author} className="h-10 w-10 shrink-0 text-sm" /></ProfileLink>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3">
                  <Link href={"/usuario/" + comment.user_id} className="inline-flex min-h-11 items-center break-words font-semibold text-secondary">{displayNameOf(comment.author)}</Link>
                  <span className="text-[13px] text-muted">{formatDate(comment.created_at)}</span>
                  {(owner || me?.user_id === comment.user_id) && <button type="button" disabled={Boolean(busy)} onClick={() => removeComment(comment.comment_id)} aria-label="Excluir comentário" className="ui-icon-button is-danger ml-auto"><Trash2 size={18} aria-hidden="true" /></button>}
                </div>
                <p className="whitespace-pre-wrap break-words text-[15px] text-foreground">{comment.content}</p>
              </div>
            </article>)}
            {comments.length < project.comments_count && <div><button disabled={Boolean(busy)} onClick={moreComments} className="ui-button">Carregar mais comentários</button></div>}
          </>}

          {tab === "equipe" && (teams.length === 0 ? <EmptyState title="Nenhuma equipe vinculada" action={owner ? <Link href="/equipes" className="ui-button ui-button-primary">Criar uma equipe</Link> : undefined}>
            {owner ? "Reúna as pessoas que fazem o projeto acontecer." : "Este projeto ainda não tem uma equipe cadastrada."}
          </EmptyState> : <div className="grid gap-4 sm:grid-cols-2">{teams.map((team) => <article key={team.team_id} className="ui-panel grid min-w-0 content-start gap-2 p-5">
            <h3 className="break-words font-heading text-lg font-bold text-secondary">{team.team_name}</h3>
            {team.purpose && <p className="break-words text-[15px] text-muted">{team.purpose}</p>}
            <p className="text-[15px]">Liderança: <ProfileLink user={team.leader}>{displayNameOf(team.leader)}</ProfileLink></p>
            <p className="text-[15px] text-muted">{team.members.length} {team.members.length === 1 ? "integrante" : "integrantes"}</p>
            {me && <Link href={"/equipe/" + team.team_id} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary">Ver equipe</Link>}
          </article>)}</div>)}
        </div>
      </div>}
    </div>}
  </PublicFrame>;
}
