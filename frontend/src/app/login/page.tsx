"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell from "@/app/_auth/AuthShell";
import { Field, SubmitButton } from "@/app/_auth/ui";
import { login, saveSession } from "@/lib/api";
import AuthSwitchLink from "@/app/_auth/AuthSwitchLink";
import { currentAuthDestination } from "@/lib/auth-navigation";

export default function LoginPage() {
  const router = useRouter();
  const [useCode,setUseCode]=useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const auth = await login({
        email: String(form.get("email")),
        password: String(form.get("password")),
        otp: String(form.get("otp") || "") || undefined,
      });
      saveSession(auth);
      const safeNext = currentAuthDestination() ?? "/feed";
      router.push(safeNext);
    } catch (err) {
      const message=err instanceof Error?err.message:"Erro ao entrar.";
      setError(message);
      if(/código|autenticador/i.test(message))setUseCode(true);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      kicker="Bem-vindo de volta"
      title="Entrar"
      subtitle="Acesse sua conta para continuar."
      footer={
        <>
          Ainda não tem conta?{" "}
          <AuthSwitchLink href="/register">
            Criar conta
          </AuthSwitchLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="voce@email.com"
          autoComplete="email"
          required
        />
        <Field
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={useCode} onChange={e=>setUseCode(e.target.checked)} className="accent-primary"/>Uso um aplicativo autenticador</label>{useCode&&<Field id="otp" name="otp" label="Código do autenticador (se ativado)" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code"/>}
        <Link href="/esqueci-senha" className="text-sm font-semibold text-primary hover:underline">Esqueci minha senha</Link>

        {error && (
          <p role="alert" className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </p>
        )}

        <div className="mt-2">
          <SubmitButton loading={loading} loadingLabel="Entrando...">
            Entrar
          </SubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
