"use client";
import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/app/_auth/AuthShell";
import { Field, SubmitButton } from "@/app/_auth/ui";
import { postJson } from "@/lib/api";

export default function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const data = new FormData(e.currentTarget); setBusy(true); setError("");
    try { const result = await postJson<{ detail: string }>("/auth/forgot-password", { email: data.get("email") }); setMessage(result.detail); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AuthShell kicker="Vamos ajudar você" title="Recuperar senha" subtitle="Enviaremos um link para o e-mail da sua conta." footer={<Link href="/login" className="font-semibold text-primary hover:underline">Voltar para entrar</Link>}>
    {message ? <div className="space-y-4"><p role="status" className="rounded-2xl bg-primary/5 p-4 text-primary">{message}</p><p className="text-sm text-gray-600">Confira também a caixa de spam. O link expira em 30 minutos. Por segurança, cada novo pedido substitui o link anterior.</p><button type="button" onClick={() => setMessage("")} className="font-semibold text-primary underline">Usar outro e-mail</button></div> : <form onSubmit={submit} className="space-y-5"><Field id="email" name="email" type="email" label="E-mail da conta" maxLength={50} autoComplete="email" required />{error && <p role="alert" className="text-red-700">{error}</p>}<SubmitButton loading={busy} loadingLabel="Enviando...">Enviar link de recuperação</SubmitButton></form>}
  </AuthShell>;
}
