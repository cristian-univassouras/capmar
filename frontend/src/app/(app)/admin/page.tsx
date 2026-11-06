"use client";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, Children, cloneElement, isValidElement, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type TdHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe, getUser, type User, type Post, type Author } from "@/lib/api";
import { adminUsers, adminPosts, adminAudit, adminUpdateUser, moderatePost, reauthenticate, type Audit } from "@/lib/engagement";
import { formatDate } from "@/lib/format";
import ProfileLink from "@/app/_components/ProfileLink";
import DiscoverPanel from "./DiscoverPanel";
import { Avatar } from "@/app/_components/media";
import { EmptyState, ListSkeleton } from "@/app/_components/ui/primitives";
import { useConfirm, useToast, type ConfirmOptions } from "@/app/_components/ui/feedback";

function AdminTable({ label, columns, children }: { label: string; columns: string[]; children: ReactNode }) {
  return <div className="ui-panel relative min-w-0 overflow-hidden">
    <div role="region" aria-label={label + ": rolagem horizontal"} tabIndex={0} className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary">
      <table className="admin-table w-full min-w-[1050px] text-left text-sm [&_td]:px-3 [&_td]:py-3 [&_td]:align-top">
        <caption className="sr-only">{label}</caption>
        <thead className="border-b border-line bg-surface-2 text-[13px] font-semibold text-muted"><tr>{columns.map((title) => <th key={title} scope="col" className="px-3 py-3 font-semibold">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{Children.map(children, row => isValidElement<{ children: ReactNode }>(row) ? cloneElement(row, { children: Children.map(row.props.children, (cell, i) => isValidElement<TdHTMLAttributes<HTMLTableCellElement>>(cell) ? cloneElement(cell, { "aria-label": columns[i], "data-label": columns[i] } as TdHTMLAttributes<HTMLTableCellElement>) : cell) }) : row)}</tbody>
      </table>
    </div>
  </div>;
}

/* ---------- abas (role=tablist, setas, indicador deslizante, ?aba= na URL) ---------- */
const TABS = [
  { id: "users", slug: "usuarios", label: "Usuários" },
  { id: "posts", slug: "publicacoes", label: "Moderação" },
  { id: "discover", slug: "descobrir", label: "Descobrir" },
  { id: "audit", slug: "auditoria", label: "Auditoria" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function AdminTabs({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bar, setBar] = useState({ x: 0, w: 0, ready: false });
  const [animate, setAnimate] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    function measure() {
      const el = refs.current[TABS.findIndex((t) => t.id === active)];
      if (el) setBar((b) => (b.x === el.offsetLeft && b.w === el.offsetWidth && b.ready ? b : { x: el.offsetLeft, w: el.offsetWidth, ready: true }));
    }
    measure();
    const ro = new ResizeObserver(measure); if (root.current) ro.observe(root.current);
    return () => ro.disconnect();
  }, [active]);
  useEffect(() => { const t = window.setTimeout(() => setAnimate(true), 60); return () => window.clearTimeout(t); }, []);
  function onKeyDown(e: ReactKeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const next = e.key === "ArrowRight" ? (index + 1) % TABS.length : e.key === "ArrowLeft" ? (index + last) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault(); refs.current[next]?.focus(); onChange(TABS[next].id);
  }
  return <div ref={root} role="tablist" aria-label="Seções administrativas" className="relative flex flex-wrap border-b border-line">
    {TABS.map((t, i) => <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" id={"aba-" + t.slug} aria-selected={active === t.id} aria-controls={"painel-" + t.slug} tabIndex={active === t.id ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={(e) => onKeyDown(e, i)} className="ui-tab !border-b-transparent">{t.label}</button>)}
    <span aria-hidden="true" className={"pointer-events-none absolute -bottom-px left-0 h-[3px] w-px origin-left rounded-full bg-primary " + (animate ? "transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]" : "")} style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})`, opacity: bar.ready ? 1 : 0 }} />
  </div>;
}

/* ---------- auditoria em português ---------- */
const auditNames: Record<string, string> = {
  "admin.user.update": "Conta atualizada", "admin.users.view": "Consulta da lista de contas", "admin.posts.view": "Consulta da lista de publicações",
  "admin.audit.view": "Consulta da auditoria", "admin.post.moderate": "Publicação moderada", "auth.login": "Entrada na conta",
  "password.changed": "Senha alterada", "password.reset": "Senha recuperada", "password.recovered": "Senha recuperada por e-mail",
  "mfa.enabled": "Proteção em duas etapas ativada", "mfa.setup": "Configuração do autenticador iniciada",
  "auth.reauthenticate": "Identidade confirmada", "reauth.success": "Identidade confirmada", "reauth.failed": "Falha ao confirmar identidade",
  "operator.create-admin": "Administrador criado pelo operador do sistema", "operator.recover": "Acesso recuperado pelo operador do sistema",
};
const isView = (action: string) => action.endsWith(".view");
function targetLabel(type: string, id: number | null) {
  const n = id ?? null;
  switch (type) {
    case "users": return "Lista de contas";
    case "posts": return "Lista de publicações";
    case "audit": return "Registro de auditoria";
    case "user": return n ? "Conta #" + n : "Conta";
    case "post": return n ? "Publicação #" + n : "Publicação";
    default: return n ? type + " #" + n : type;
  }
}
const valueNames: Record<string, Record<string, string>> = {
  role: { admin: "Administrador", user: "Usuário" },
  is_active: { true: "Ativa", false: "Suspensa" },
  is_hidden: { true: "Oculta", false: "Visível" },
};
const keyNames: Record<string, string> = { role: "Papel", is_active: "Conta", is_hidden: "Publicação", operator: "Operador do sistema" };
function describe(details: string): string[] {
  let data: unknown;
  try { data = JSON.parse(details); } catch { return details ? [details] : []; }
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const fmt = (k: string, v: unknown) => valueNames[k]?.[String(v)] ?? String(v);
  const lines: string[] = [];
  if (d.before && d.after && typeof d.before === "object" && typeof d.after === "object") {
    const b = d.before as Record<string, unknown>; const a = d.after as Record<string, unknown>;
    for (const k of Object.keys(a)) if (b[k] !== a[k]) lines.push((keyNames[k] ?? k) + ": " + fmt(k, b[k]) + " → " + fmt(k, a[k]));
    if (!lines.length) lines.push("Nenhum valor mudou.");
  }
  for (const [k, v] of Object.entries(d)) if (k !== "before" && k !== "after") lines.push((keyNames[k] ?? k) + ": " + String(v));
  return lines;
}

const roleName = (r: string) => (r === "admin" ? "Administrador" : "Usuário");
const hint = "text-[13px] text-muted";

type Draft = { role: string; active: boolean };

function AdminContent() {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const toast = useToast();
  const tab: TabId = TABS.find((t) => t.slug === params.get("aba"))?.id ?? "users";
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<(Post & { is_hidden: boolean })[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [actors, setActors] = useState<Record<number, Author | null>>({});
  const [showViews, setShowViews] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [resolved, setResolved] = useState("");
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ role: "user", active: true });
  const [moderating, setModerating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const key = [tab, page, query, revision].join(":");
  useEffect(() => { getMe().then(setMe).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (me?.role !== "admin") return;
    let active = true;
    const load = tab === "users" ? adminUsers(query, page * 20).then((r) => { if (active) { setUsers(r.items); setTotal(r.total); } })
      : tab === "posts" ? adminPosts(page * 20).then((r) => { if (active) { setPosts(r.items); setTotal(r.total); } })
        : tab === "discover" ? Promise.resolve()
        : adminAudit().then((r) => { if (active) setAudit(r); });
    load.then(() => { if (active) setError(""); }).catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setResolved(key); });
    return () => { active = false; };
  }, [me, tab, page, query, revision, key]);

  // Nomes dos responsáveis: perfil público, que não gera registro de consulta administrativa.
  useEffect(() => {
    const ids = [...new Set(audit.map((a) => a.actor_id).filter((id): id is number => !!id && !(id in actors)))];
    if (!ids.length) return;
    let active = true;
    Promise.all(ids.map((id) => getUser(id).then((u) => [id, u] as const).catch(() => [id, null] as const))).then((pairs) => {
      if (active) setActors((old) => ({ ...old, ...Object.fromEntries(pairs) }));
    });
    return () => { active = false; };
  }, [audit, actors]);

  function changeTab(id: TabId) {
    if (id === tab) return;
    setPage(0); setEditingUser(null); setModerating(null); setError("");
    router.replace("/admin?aba=" + TABS.find((t) => t.id === id)!.slug, { scroll: false });
  }

  /** Lê o formulário, pede confirmação quando a ação é destrutiva, executa e avisa com texto específico. */
  async function action(event: React.FormEvent<HTMLFormElement>, run: (data: FormData) => Promise<unknown>, success: string, ask?: (data: FormData) => ConfirmOptions | null) {
    event.preventDefault(); if (busy) return false;
    const form = event.currentTarget; const data = new FormData(form);
    const options = ask?.(data);
    if (options && !(await confirm(options))) return false;
    setBusy(true); setError("");
    try { await run(data); toast(success, "success"); form.reset(); setRevision((r) => r + 1); return true; }
    catch (e) { toast(e instanceof Error ? e.message : "Não foi possível concluir a operação.", "error"); return false; }
    finally { setBusy(false); }
  }

  if (me && me.role !== "admin") return <div className="mx-auto max-w-2xl"><EmptyState title="Acesso restrito" action={<Link href="/feed" className="ui-button ui-button-primary">Voltar para o início</Link>}>Seu usuário não tem permissão administrativa. Se você acha que deveria ter, fale com quem cuida da plataforma.</EmptyState></div>;

  const pageCount = Math.max(1, Math.ceil(total / 20));
  const panel = TABS.find((t) => t.id === tab)!;
  const visibleAudit = showViews ? audit : audit.filter((a) => !isView(a.action));
  const loading = !me || resolved !== key;

  return <div className="mx-auto min-w-0 max-w-7xl space-y-5">
    <div className="ui-page-heading"><div><h1>Administração</h1><p>Gerencie contas e publicações. Alterações exigem uma justificativa e ficam registradas.</p></div></div>
    {error && <p role="alert" className="ui-error">{error}</p>}
    <details className="ui-panel group p-4"><summary className="flex min-h-11 cursor-pointer items-center font-semibold text-secondary">Confirmar identidade / renovar acesso</summary>
      <form aria-label="Confirmar identidade" onSubmit={(e) => action(e, (d) => reauthenticate(String(d.get("password")), String(d.get("otp"))), "Identidade confirmada. Você já pode continuar por mais alguns minutos.")} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="ui-field">Senha atual<input name="password" type="password" autoComplete="current-password" required /></label>
        <label className="ui-field">Código do autenticador<input name="otp" pattern="[0-9]{6}" maxLength={6} inputMode="numeric" required /></label>
        <button disabled={busy} className="ui-button ui-button-primary self-end">Confirmar identidade</button>
      </form>
    </details>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <AdminTabs active={tab} onChange={changeTab} />
      <button type="button" onClick={() => setRevision((r) => r + 1)} className="ui-button ui-button-quiet">Atualizar</button>
    </div>
    <div role="tabpanel" id={"painel-" + panel.slug} aria-labelledby={"aba-" + panel.slug} key={tab} className="page-enter space-y-5">
      {tab === "users" && <form onSubmit={(e) => { e.preventDefault(); setQuery(String(new FormData(e.currentTarget).get("q"))); setPage(0); }} className="flex gap-3"><input aria-label="Buscar usuários" name="q" maxLength={100} placeholder="Usuário ou e-mail" className="ui-input" /><button className="ui-button">Buscar</button></form>}
      {tab === "audit" && <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-[15px] text-secondary"><input type="checkbox" checked={showViews} onChange={(e) => setShowViews(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />Mostrar também as consultas às listas</label>}
      {loading ? <ListSkeleton rows={5} label="Carregando painel" /> : !error && <>
        {tab === "discover" && <DiscoverPanel refresh={revision} />}
        {tab === "users" && (users.length ? <AdminTable label="Gestão de usuários" columns={["Usuário", "E-mail", "Papel", "Conta", "Duas etapas", "Ações"]}>
          {users.map((user) => {
            const formId = "manage-user-" + user.user_id;
            const locked = busy || user.user_id === me?.user_id;
            const editing = editingUser === user.user_id;
            const changes: string[] = [];
            if (editing && draft.role !== user.role) changes.push("Papel: " + roleName(user.role) + " → " + roleName(draft.role));
            if (editing && draft.active !== user.is_active) changes.push("Conta: " + (user.is_active ? "Ativa" : "Suspensa") + " → " + (draft.active ? "Ativa" : "Suspensa"));
            const promoting = editing && draft.role === "admin" && user.role !== "admin";
            const suspending = editing && !draft.active && user.is_active;
            return <tr key={user.user_id + ":" + revision}>
              <td><ProfileLink user={user} className="flex min-h-11 min-w-36 items-center gap-3 font-semibold"><Avatar user={user} className="h-9 w-9 text-sm" /><span className="break-all">@{user.username}<span className={"block font-normal " + hint}>#{user.user_id}</span></span></ProfileLink></td>
              <td><span className="whitespace-nowrap">{user.email}</span></td>
              <td>{!editing && <span>{roleName(user.role)}</span>}<label htmlFor={formId + "-role"} className="sr-only">Papel de @{user.username}</label><select id={formId + "-role"} form={formId} name="role" value={editing ? draft.role : user.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} disabled={locked} className={"ui-input !min-h-11 w-40 disabled:opacity-60 " + (editing ? "" : "hidden")}><option value="user">Usuário</option><option value="admin" disabled={!user.mfa_enabled}>Administrador</option></select>{editing && !user.mfa_enabled && <p className={"mt-1 " + hint}>Só quem ativou as duas etapas pode ser administrador.</p>}</td>
              <td>{!editing && <span className={"ui-badge !text-[13px] " + (user.is_active ? "is-public" : "!border-[#e6b8b4] !bg-danger-soft !text-[#8a1b15]")}>{user.is_active ? "Ativa" : "Suspensa"}</span>}
                <label className={"min-h-11 cursor-pointer items-center gap-3 " + (editing ? "flex" : "hidden")}><input form={formId} name="active" type="checkbox" role="switch" checked={editing ? draft.active : user.is_active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} disabled={locked} className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-danger transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:duration-200 after:content-[''] checked:bg-tertiary checked:after:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" /><span><span className="block font-semibold text-secondary">Conta ativa</span><span className={"block " + hint}>{draft.active ? "Pode entrar na plataforma" : "Suspensa: não consegue entrar"}</span></span></label></td>
              <td><span className={"ui-badge !text-[13px] " + (user.mfa_enabled ? "is-public" : "")}>{user.mfa_enabled ? "Ativada" : "Desativada"}</span></td>
              <td>{!editing && <button disabled={user.user_id === me?.user_id} onClick={() => { setDraft({ role: user.role, active: user.is_active }); setEditingUser(user.user_id); }} className="ui-button text-[14px]">{user.user_id === me?.user_id ? "Conta protegida" : "Gerenciar conta"}</button>}<form className={editing ? "" : "hidden"} id={formId} aria-label={"Gerenciar " + user.username}
                onSubmit={async (e) => {
                  if (!changes.length) { e.preventDefault(); toast("Nenhuma alteração para salvar em @" + user.username + ".", "info"); return; }
                  const done: string[] = [];
                  if (draft.role !== user.role) done.push("papel alterado para " + roleName(draft.role));
                  if (draft.active !== user.is_active) done.push(draft.active ? "conta reativada" : "conta suspensa");
                  const ok = await action(e, (d) => adminUpdateUser(user.user_id, draft.role, draft.active, String(d.get("reason"))), "@" + user.username + ": " + done.join(" e ") + ". Registrado na auditoria.",
                    (d) => (promoting || suspending) ? {
                      title: promoting && suspending ? "Aplicar alterações sensíveis em @" + user.username + "?" : promoting ? "Promover @" + user.username + " a administrador?" : "Suspender a conta de @" + user.username + "?",
                      message: changes.join(". ") + "." + (suspending ? " As sessões abertas dessa pessoa serão encerradas." : "") + (promoting ? " Administradores veem e alteram contas e publicações." : "") + " Motivo registrado: “" + String(d.get("reason")) + "”.",
                      confirmLabel: promoting && suspending ? "Aplicar alterações" : promoting ? "Promover a administrador" : "Suspender conta", danger: true,
                    } : null);
                  if (ok) setEditingUser(null);
                }}>
                <fieldset disabled={locked} className="space-y-3">
                  <div aria-live="polite" className={"rounded-xl p-3 text-[14px] " + (promoting || suspending ? "bg-danger-soft text-[#8a1b15]" : "bg-surface-2 text-secondary")}>
                    <p className="font-semibold">{changes.length ? "O que vai mudar" : "Nenhuma alteração ainda"}</p>
                    {changes.length ? <ul className="mt-1 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="mt-1">Mude o papel ou o estado da conta acima.</p>}
                  </div>
                  <label className="ui-field">Motivo<input name="reason" minLength={5} maxLength={500} required placeholder="Justifique a alteração" /></label>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!changes.length} className={"ui-button " + (promoting || suspending ? "ui-button-danger" : "ui-button-primary")}>{promoting || suspending ? "Revisar e salvar" : "Salvar usuário"}</button>
                    <button type="button" onClick={() => { setEditingUser(null); setRevision(r => r + 1); }} className="ui-button ui-button-quiet">Cancelar</button>
                  </div>
                </fieldset>
                {user.user_id === me?.user_id && <p className={"mt-2 " + hint}>Sua conta está protegida contra desativação e rebaixamento.</p>}
              </form></td>
            </tr>;
          })}
        </AdminTable> : <EmptyState title="Nenhum usuário encontrado">{query ? "Nada para “" + query + "”. Tente outro nome, usuário ou e-mail, ou limpe a busca." : "Ainda não há contas cadastradas."}</EmptyState>)}

        {tab === "posts" && (posts.length ? <AdminTable label="Moderação de publicações" columns={["Publicação", "Autor", "Conteúdo", "Estado", "Ações"]}>
          {posts.map((post) => {
            const authorName = post.author ? "@" + post.author.username : "usuário #" + post.user_id;
            return <tr key={post.post_id + ":" + revision}>
              <td><span className="font-semibold">#{post.post_id}</span><span className={"mt-1 block whitespace-nowrap " + hint}>{formatDate(post.created_at)}</span></td>
              <td><ProfileLink user={post.author} userId={post.user_id} className="flex min-h-11 min-w-36 items-center gap-2 font-semibold"><Avatar user={post.author} className="h-8 w-8 text-xs" /><span className="break-all">{post.author ? "@" + post.author.username : "Usuário #" + post.user_id}</span></ProfileLink></td>
              <td><div className="max-h-40 min-w-0 max-w-md overflow-y-auto whitespace-pre-wrap break-words">{post.content || "Publicação sem texto"}</div></td>
              <td><span className={"ui-badge !text-[13px] " + (post.is_hidden ? "is-draft" : "is-public")}>{post.is_hidden ? "Oculta" : "Visível"}</span></td>
              <td>{moderating !== post.post_id && <button onClick={() => setModerating(post.post_id)} className="ui-button text-[14px]">Revisar publicação</button>}<form aria-label={"Moderar publicação " + post.post_id}
                onSubmit={(e) => action(e, (d) => moderatePost(post.post_id, !post.is_hidden, String(d.get("reason"))),
                  post.is_hidden ? "Publicação #" + post.post_id + " restaurada. Registrado na auditoria." : "Publicação #" + post.post_id + " ocultada do feed. Registrado na auditoria.",
                  (d) => post.is_hidden ? null : {
                    title: "Ocultar a publicação #" + post.post_id + "?",
                    message: "Ela deixa de aparecer no feed para todas as pessoas. Autor: " + authorName + ". Trecho: “" + (post.content.length > 90 ? post.content.slice(0, 90) + "…" : post.content || "sem texto") + "”. Motivo registrado: “" + String(d.get("reason")) + "”.",
                    confirmLabel: "Ocultar agora", danger: true,
                  })}
                className={"w-full min-w-48 max-w-xs space-y-3 " + (moderating === post.post_id ? "" : "hidden")}>
                <p className={"rounded-xl p-3 text-[14px] " + (post.is_hidden ? "bg-surface-2 text-secondary" : "bg-danger-soft text-[#8a1b15]")}>{post.is_hidden ? "Restaurar faz a publicação voltar a aparecer no feed." : "Ocultar tira a publicação do feed. A ação fica registrada com o seu nome."}</p>
                <label className="ui-field">Motivo<input name="reason" minLength={5} maxLength={500} required placeholder="Justifique a moderação" /></label>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} className={"ui-button " + (post.is_hidden ? "ui-button-primary" : "ui-button-danger")}>{post.is_hidden ? "Restaurar publicação" : "Ocultar publicação"}</button>
                  <button type="button" onClick={() => setModerating(null)} className="ui-button ui-button-quiet">Fechar revisão</button>
                </div>
              </form></td>
            </tr>;
          })}
        </AdminTable> : <EmptyState title="Nenhuma publicação para moderar">Quando alguém publicar no feed, as publicações aparecem aqui para revisão.</EmptyState>)}

        {tab === "audit" && <>{visibleAudit.length ? <AdminTable label="Registro de auditoria" columns={["ID", "Data e hora", "Responsável", "Ação", "Recurso", "Motivo", "Dados"]}>
          {visibleAudit.map((entry) => {
            const actor = entry.actor_id ? actors[entry.actor_id] : null;
            const lines = describe(entry.details);
            return <tr key={entry.audit_id}>
              <td className="font-semibold">#{entry.audit_id}</td>
              <td className="whitespace-nowrap">{new Date(entry.created_at).toLocaleString("pt-BR")}</td>
              <td>{entry.actor_id ? <ProfileLink user={actor} userId={entry.actor_id} className="inline-flex min-h-11 items-center whitespace-nowrap text-primary">{actor ? "@" + actor.username : "Usuário #" + entry.actor_id}</ProfileLink> : <span className="whitespace-nowrap">Operador do sistema</span>}</td>
              <td><span className="block max-w-48 break-words font-medium">{auditNames[entry.action] ?? entry.action}</span></td>
              <td><span className="whitespace-nowrap">{targetLabel(entry.target_type, entry.target_id)}</span></td>
              <td><p className="min-w-52 max-w-80 whitespace-pre-wrap break-words">{entry.reason}</p></td>
              <td>{lines.length ? <details className="w-full max-w-56"><summary className="flex min-h-11 cursor-pointer items-center text-primary">Ver detalhes</summary><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto break-words rounded-lg bg-surface-2 p-2 text-[13px]">{lines.map((l) => <li key={l}>{l}</li>)}</ul></details> : <span className={hint}>Sem detalhes</span>}</td>
            </tr>;
          })}
        </AdminTable> : <EmptyState title={audit.length ? "Só há consultas por enquanto" : "Nenhum registro de auditoria"}>{audit.length ? "Marque “Mostrar também as consultas às listas” para vê-las." : "Alterações de contas e moderações aparecem aqui assim que acontecerem."}</EmptyState>}
          {audit.length > 0 && <button disabled={busy} onClick={async () => { setBusy(true); try { const older = await adminAudit(audit[audit.length - 1].audit_id); setAudit((items) => [...items, ...older]); toast(older.length ? older.length + " registros anteriores carregados." : "Todos os registros já foram carregados.", older.length ? "success" : "info"); } catch (e) { toast(e instanceof Error ? e.message : "Não foi possível carregar os registros anteriores.", "error"); } finally { setBusy(false); } }} className="ui-button">Carregar registros anteriores</button>}</>}

        {tab !== "audit" && total > 0 && <nav aria-label="Paginação administrativa" className="flex flex-wrap items-center gap-3"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="ui-button">Anterior</button><span className="text-[15px] text-secondary">{total} {total === 1 ? "registro" : "registros"} · página {page + 1} de {pageCount}</span><button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)} className="ui-button">Próxima</button></nav>}
      </>}
    </div>
  </div>;
}

export default function AdminPage() {
  return <Suspense fallback={<ListSkeleton rows={5} label="Carregando painel" />}><AdminContent /></Suspense>;
}
