"use client";
import { useEffect, useState, type ReactNode } from "react";
import { getMe, type User, type Post } from "@/lib/api";
import { adminUsers, adminPosts, adminAudit, adminUpdateUser, moderatePost, reauthenticate, type Audit } from "@/lib/engagement";
import { formatDate } from "@/lib/format";
import ProfileLink from "@/app/_components/ProfileLink";
import { Avatar } from "@/app/_components/media";

function AdminTable({ label, columns, children }: { label: string; columns: string[]; children: ReactNode }) {
  return <div className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 lg:hidden">Deslize a tabela para ver todas as colunas.</p>
    <div role="region" aria-label={label + ": rolagem horizontal"} tabIndex={0} className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary">
      <table className="w-full min-w-[1050px] text-left text-sm [&_td]:px-3 [&_td]:py-3 [&_td]:align-top">
        <caption className="sr-only">{label}</caption>
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600"><tr>{columns.map((title) => <th key={title} scope="col" className="px-3 py-3 font-semibold">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 [&_tr:hover]:bg-gray-50/60">{children}</tbody>
      </table>
    </div>
  </div>;
}

const field = "w-full min-w-0 rounded-xl border border-gray-300 bg-white p-3";
export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<(Post & { is_hidden: boolean })[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [resolved, setResolved] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const key = [tab, page, query, revision].join(":");
  useEffect(() => { getMe().then(setMe).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (me?.role !== "admin") return;
    let active = true;
    const load = tab === "users" ? adminUsers(query, page * 20).then((r) => { if (active) { setUsers(r.items); setTotal(r.total); } })
      : tab === "posts" ? adminPosts(page * 20).then((r) => { if (active) { setPosts(r.items); setTotal(r.total); } })
      : adminAudit().then((r) => { if (active) setAudit(r); });
    load.then(() => { if (active) setError(""); }).catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setResolved(key); });
    return () => { active = false; };
  }, [me, tab, page, query, revision, key]);
  async function action(event: React.FormEvent<HTMLFormElement>, run: (data: FormData) => Promise<unknown>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    try { await run(new FormData(form)); setNotice("Operação concluída e registrada."); form.reset(); setRevision((r) => r + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha na operação"); }
    finally { setBusy(false); }
  }
  if (me && me.role !== "admin") return <div><h1 className="text-2xl font-bold">Acesso restrito</h1><p>Seu usuário não tem permissão administrativa.</p></div>;
  return <div className="mx-auto min-w-0 max-w-7xl space-y-5"><h1 className="text-3xl font-bold">Administração</h1>
    <p>Alterações exigem um motivo. Ações e consultas de gestão ficam registradas.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4">{notice}</p>}
    <details className="rounded-xl border border-gray-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Confirmar identidade / renovar acesso</summary>
      <form aria-label="Confirmar identidade" onSubmit={(e) => action(e, (d) => reauthenticate(String(d.get("password")), String(d.get("otp"))))} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label>Senha atual<input className={field} name="password" type="password" autoComplete="current-password" required /></label>
        <label>Código do autenticador<input className={field} name="otp" pattern="[0-9]{6}" maxLength={6} inputMode="numeric" required /></label>
        <button disabled={busy} className="self-end rounded-xl bg-primary p-3 text-white">Confirmar identidade</button>
      </form>
    </details>
    <nav aria-label="Seções administrativas" className="flex flex-wrap gap-3">{[["users", "Usuários"], ["posts", "Moderação"], ["audit", "Auditoria"]].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(0); }} className={"rounded-xl border px-4 py-3 " + (tab === value ? "bg-primary text-white" : "bg-white")}>{label}</button>)}<button onClick={() => setRevision((r) => r + 1)} className="px-3 underline">Atualizar</button></nav>
    {tab === "users" && <form onSubmit={(e) => { e.preventDefault(); setQuery(String(new FormData(e.currentTarget).get("q"))); setPage(0); }} className="flex gap-3"><input aria-label="Buscar usuários" name="q" maxLength={100} placeholder="Usuário ou e-mail" className={field} /><button className="rounded-xl border bg-white px-4">Buscar</button></form>}
    {resolved !== key ? <p role="status">Carregando painel...</p> : !error && <>
      {tab === "users" && <AdminTable label="Gestão de usuários" columns={["Usuário", "E-mail", "Papel", "Status", "MFA", "Ações"]}>
        {users.map((user) => {
          const formId = "manage-user-" + user.user_id;
          const locked = busy || user.user_id === me?.user_id;
          return <tr key={user.user_id + ":" + revision}>
            <td><ProfileLink user={user} className="flex min-w-36 items-center gap-3 font-semibold"><Avatar user={user} className="h-9 w-9 text-sm" /><span className="break-all">@{user.username}<span className="block text-xs font-normal text-gray-500">#{user.user_id}</span></span></ProfileLink></td>
            <td><span className="whitespace-nowrap">{user.email}</span></td>
            <td><label htmlFor={formId + "-role"} className="sr-only">Papel de @{user.username}</label><select id={formId + "-role"} form={formId} name="role" defaultValue={user.role} disabled={locked} className="w-32 rounded-lg border border-gray-300 bg-white p-2 disabled:opacity-60"><option value="user">Usuário</option><option value="admin" disabled={!user.mfa_enabled}>Administrador</option></select></td>
            <td><label className="flex items-center gap-2 whitespace-nowrap"><input form={formId} name="active" type="checkbox" defaultChecked={user.is_active} disabled={locked} />Conta ativa</label></td>
            <td><span className={"inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium " + (user.mfa_enabled ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600")}>{user.mfa_enabled ? "Ativo" : "Inativo"}</span></td>
            <td><form id={formId} aria-label={"Gerenciar " + user.username} onSubmit={(e) => action(e, (d) => adminUpdateUser(user.user_id, String(d.get("role")), d.get("active") === "on", String(d.get("reason"))))} className="w-60">
              <fieldset disabled={locked} className="space-y-2"><label className="block text-xs">Motivo<input name="reason" minLength={5} maxLength={500} required className="mt-1 w-full rounded-lg border border-gray-300 p-2" placeholder="Justifique a alteração" /></label><button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:opacity-50">Salvar usuário</button></fieldset>
              {user.user_id === me?.user_id && <p className="mt-2 text-xs text-gray-500">Sua conta está protegida contra desativação e rebaixamento.</p>}
            </form></td>
          </tr>;
        })}
        {!users.length && <tr><td colSpan={6} className="text-center text-gray-500">Nenhum usuário encontrado.</td></tr>}
      </AdminTable>}
      {tab === "posts" && <AdminTable label="Moderação de publicações" columns={["Publicação", "Autor", "Conteúdo", "Estado", "Ações"]}>
        {posts.map((post) => <tr key={post.post_id + ":" + revision}>
          <td><span className="font-semibold">#{post.post_id}</span><span className="mt-1 block whitespace-nowrap text-xs text-gray-500">{formatDate(post.created_at)}</span></td>
          <td><ProfileLink user={post.author} userId={post.user_id} className="flex min-w-36 items-center gap-2 font-semibold"><Avatar user={post.author} className="h-8 w-8 text-xs" /><span className="break-all">{post.author ? "@" + post.author.username : "Usuário #" + post.user_id}</span></ProfileLink></td>
          <td><div className="max-h-40 min-w-64 max-w-md overflow-y-auto whitespace-pre-wrap break-words">{post.content || "Publicação sem texto"}</div></td>
          <td><span className={"inline-block rounded-full px-2 py-1 text-xs font-medium " + (post.is_hidden ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800")}>{post.is_hidden ? "Oculta" : "Visível"}</span></td>
          <td><form aria-label={"Moderar publicação " + post.post_id} onSubmit={(e) => action(e, (d) => moderatePost(post.post_id, !post.is_hidden, String(d.get("reason"))))} className="w-60 space-y-2">
            <label className="block text-xs">Motivo<input name="reason" minLength={5} maxLength={500} required className="mt-1 w-full rounded-lg border border-gray-300 p-2" placeholder="Justifique a moderação" /></label>
            <button disabled={busy} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-50">{post.is_hidden ? "Restaurar publicação" : "Ocultar publicação"}</button>
          </form></td>
        </tr>)}
        {!posts.length && <tr><td colSpan={5} className="text-center text-gray-500">Nenhuma publicação encontrada.</td></tr>}
      </AdminTable>}
      {tab === "audit" && <><AdminTable label="Registro de auditoria" columns={["ID", "Data e hora", "Responsável", "Ação", "Recurso", "Motivo", "Dados"]}>
        {audit.map((entry) => <tr key={entry.audit_id}>
          <td className="font-semibold">#{entry.audit_id}</td>
          <td className="whitespace-nowrap">{new Date(entry.created_at).toLocaleString("pt-BR")}</td>
          <td><ProfileLink userId={entry.actor_id} className="whitespace-nowrap text-primary">{entry.actor_id ? "Usuário #" + entry.actor_id : "Operador local"}</ProfileLink></td>
          <td><span className="block max-w-48 break-words font-medium">{entry.action}</span></td>
          <td><span className="whitespace-nowrap">{entry.target_type} #{entry.target_id ?? "—"}</span></td>
          <td><p className="min-w-52 max-w-80 whitespace-pre-wrap break-words">{entry.reason}</p></td>
          <td><details className="w-56"><summary className="cursor-pointer text-primary">Ver detalhes</summary><pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-gray-50 p-2 text-xs">{entry.details}</pre></details></td>
        </tr>)}
        {!audit.length && <tr><td colSpan={7} className="text-center text-gray-500">Nenhum registro de auditoria.</td></tr>}
      </AdminTable>
        {audit.length > 0 && <button disabled={busy} onClick={async () => { setBusy(true); try { const older = await adminAudit(audit[audit.length - 1].audit_id); setAudit((items) => [...items, ...older]); if (!older.length) setNotice("Todos os registros foram carregados."); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar"); } finally { setBusy(false); } }} className="rounded-xl border bg-white p-3">Carregar registros anteriores</button>}</>}
      {tab !== "audit" && <nav aria-label="Paginação administrativa" className="flex flex-wrap items-center gap-3"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-xl border p-3 disabled:opacity-40">Anterior</button><span>{total} registros · página {page + 1}</span><button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)} className="rounded-xl border p-3 disabled:opacity-40">Próxima</button></nav>}
    </>}
  </div>;
}
