"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell from "@/app/_auth/AuthShell";
import { Field, SubmitButton } from "@/app/_auth/ui";
import { login, saveSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
      });
      saveSession(auth);
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
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
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
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

        {error && (
          <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
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
