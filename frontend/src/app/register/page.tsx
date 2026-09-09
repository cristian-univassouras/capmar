"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell from "@/app/_auth/AuthShell";
import { Field, SubmitButton } from "@/app/_auth/ui";
import { register, saveSession } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const auth = await register({
        first_name: String(form.get("first_name")) || undefined,
        last_name: String(form.get("last_name")) || undefined,
        username: String(form.get("username")),
        email: String(form.get("email")),
        password,
      });
      saveSession(auth);
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      kicker="Vamos começar"
      title="Criar conta"
      subtitle="Crie seu perfil e comece a mostrar seus projetos."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="first_name"
            name="first_name"
            label="Nome"
            placeholder="Maria"
            autoComplete="given-name"
            maxLength={20}
          />
          <Field
            id="last_name"
            name="last_name"
            label="Sobrenome"
            placeholder="Silva"
            autoComplete="family-name"
            maxLength={100}
          />
        </div>

        <Field
          id="username"
          name="username"
          label="Nome de usuário"
          placeholder="maria.silva"
          autoComplete="username"
          minLength={3}
          maxLength={20}
          required
        />
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
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Field
          id="confirm"
          name="confirm"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && (
          <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </p>
        )}

        <div className="mt-2">
          <SubmitButton loading={loading} loadingLabel="Criando conta...">
            Criar conta
          </SubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
