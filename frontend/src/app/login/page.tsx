"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell from "@/app/_auth/AuthShell";
import { useRedirectIfAuthenticated } from "@/lib/use-redirect-if-authenticated";
import { Field, FormError, SubmitButton } from "@/app/_auth/ui";
import { login, saveSession } from "@/lib/api";
import AuthSwitchLink from "@/app/_auth/AuthSwitchLink";
import { currentAuthDestination } from "@/lib/auth-navigation";

export default function LoginPage() {
  const router = useRouter();
  useRedirectIfAuthenticated();
  const [useCode,setUseCode]=useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      setDone(true);
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
      title="Entrar"
      subtitle="Entre para continuar de onde parou."
      footer={
        <>
          Ainda não tem conta?{" "}
          <AuthSwitchLink href="/register">
            Criar conta
          </AuthSwitchLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-5">
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

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-gray-600"><input type="checkbox" checked={useCode} onChange={e=>setUseCode(e.target.checked)} className="h-5 w-5"/>Uso um aplicativo autenticador</label>{useCode&&<Field id="otp" name="otp" label="Código do autenticador (se ativado)" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code"/>}
        <Link href="/esqueci-senha" className="inline-flex min-h-11 items-center justify-self-start text-[15px] font-semibold text-primary hover:underline">Esqueci minha senha</Link>

        <FormError message={error} />

        <div className="mt-2">
          <SubmitButton loading={loading} done={done} loadingLabel="Entrando...">
            Entrar
          </SubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
