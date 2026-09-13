"use client";
import { useEffect, useState } from "react";
import { getMe, type User, type Post } from "@/lib/api";
import { adminUsers, adminPosts, adminAudit, adminUpdateUser, moderatePost, reauthenticate, type Audit } from "@/lib/engagement";
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
  return <div className="mx-auto max-w-5xl space-y-5"><h1 className="text-3xl font-bold">Administração</h1>
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
      {tab === "users" && users.map((user) => <form key={user.user_id + ":" + revision} aria-label={"Gerenciar " + user.username} className="space-y-3 rounded-2xl bg-white p-5" onSubmit={(e) => action(e, (d) => adminUpdateUser(user.user_id, String(d.get("role")), d.get("active") === "on", String(d.get("reason"))))}>
        <h2 className="break-words font-bold">@{user.username} · #{user.user_id}</h2><p className="break-all text-sm">{user.email} · MFA {user.mfa_enabled ? "ativo" : "inativo"}</p>
        <fieldset disabled={busy || user.user_id === me?.user_id} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label>Papel<select name="role" defaultValue={user.role} className={field}><option value="user">Usuário</option><option value="admin" disabled={!user.mfa_enabled}>Administrador (exige MFA)</option></select></label>
          <label className="flex items-center gap-3"><input name="active" type="checkbox" defaultChecked={user.is_active} />Conta ativa</label>
          <label className="sm:col-span-2">Motivo<input name="reason" minLength={5} maxLength={500} required className={field} /></label>
          <button className="rounded-xl bg-primary p-3 text-white disabled:opacity-50">Salvar usuário</button>
        </fieldset>{user.user_id === me?.user_id && <p className="text-sm">Sua própria conta está protegida contra desativação e rebaixamento.</p>}
      </form>)}
      {tab === "posts" && posts.map((post) => <form key={post.post_id + ":" + revision} aria-label={"Moderar publicação " + post.post_id} onSubmit={(e) => action(e, (d) => moderatePost(post.post_id, !post.is_hidden, String(d.get("reason"))))} className="space-y-3 rounded-2xl bg-white p-5">
        <h2 className="font-bold">Publicação #{post.post_id} · @{post.author?.username} · {post.is_hidden ? "Oculta" : "Visível"}</h2><p className="whitespace-pre-wrap break-words">{post.content}</p>
        <label className="block">Motivo<input name="reason" minLength={5} maxLength={500} required className={field} /></label>
        <button disabled={busy} className="rounded-xl border border-primary px-5 py-3 text-primary">{post.is_hidden ? "Restaurar publicação" : "Ocultar publicação"}</button>
      </form>)}
      {tab === "audit" && <><ol className="space-y-3">{audit.map((entry) => <li key={entry.audit_id} className="space-y-2 rounded-xl bg-white p-4"><p className="break-words font-bold">#{entry.audit_id} · {entry.action}</p><p className="text-sm">{new Date(entry.created_at).toLocaleString("pt-BR")} · Ator #{entry.actor_id ?? "operador"} · {entry.target_type} #{entry.target_id ?? "—"}</p><p className="break-words">{entry.reason}</p><pre className="whitespace-pre-wrap break-all text-xs">{entry.details}</pre></li>)}</ol>
        {audit.length > 0 && <button disabled={busy} onClick={async () => { setBusy(true); try { const older = await adminAudit(audit[audit.length - 1].audit_id); setAudit((items) => [...items, ...older]); if (!older.length) setNotice("Todos os registros foram carregados."); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar"); } finally { setBusy(false); } }} className="rounded-xl border bg-white p-3">Carregar registros anteriores</button>}</>}
      {tab !== "audit" && <nav aria-label="Paginação administrativa" className="flex items-center gap-3"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-xl border p-3 disabled:opacity-40">Anterior</button><span>{total} registros · página {page + 1}</span><button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)} className="rounded-xl border p-3 disabled:opacity-40">Próxima</button></nav>}
    </>}
  </div>;
}
