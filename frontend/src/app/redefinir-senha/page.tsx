"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import AuthShell from "@/app/_auth/AuthShell";
import { Field, SubmitButton } from "@/app/_auth/ui";
import { clearStoredUser, postJson } from "@/lib/api";

function subscribeLink(change: () => void) {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
}
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";

export default function ResetPassword() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const token = useSyncExternalStore(subscribeLink, readToken, () => "");
  const validLink = /^[A-Za-z0-9_-]{43}$/.test(token);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirm")) { setError("As senhas precisam ser iguais."); return; }
    if (new TextEncoder().encode(password).length > 72) { setError("A senha é longa demais. Use menos caracteres."); return; }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setError("Link inválido ou expirado. Solicite um novo link."); return; }
    setBusy(true); setError("");
    try { await postJson("/auth/reset-password", { token, password, otp: String(form.get("otp") || "") || undefined }); clearStoredUser(); window.history.replaceState(null, "", "/redefinir-senha"); setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível redefinir sua senha."); }
    finally { setBusy(false); }
  }
  return <AuthShell kicker="Uma nova senha" title="Redefinir senha" subtitle="Escolha uma senha segura para sua conta CapMar." footer={<Link href={done ? "/login" : "/esqueci-senha"} className="font-semibold text-primary hover:underline">{done ? "Entrar com a nova senha" : "Solicitar novo link"}</Link>}>
    {done ? <p role="status" className="rounded-2xl bg-primary/5 p-4 text-primary">Senha redefinida. Suas sessões anteriores foram encerradas. Entre com sua nova senha.</p> : !validLink ? <p role="alert" className="rounded-2xl bg-primary/5 p-4 text-primary">Link inválido ou ausente. Solicite um novo link para redefinir sua senha.</p> : <form onSubmit={submit} className="space-y-5"><Field id="password" name="password" type="password" label="Nova senha" minLength={12} maxLength={72} autoComplete="new-password" required /><p className="text-xs text-gray-600">Use pelo menos 12 caracteres e uma senha exclusiva para esta conta.</p><Field id="confirm" name="confirm" type="password" label="Confirmar nova senha" minLength={12} maxLength={72} autoComplete="new-password" required /><Field id="otp" name="otp" label="Código do autenticador (se ativado)" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}<SubmitButton loading={busy} loadingLabel="Salvando...">Redefinir senha</SubmitButton></form>}
  </AuthShell>;
}
