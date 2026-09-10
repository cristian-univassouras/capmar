"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearStoredUser, getMe, saveUser } from "@/lib/api";

/**
 * Protege as rotas do app. O JWT fica num cookie HttpOnly (US-026), invisível
 * para o JavaScript, então quem diz se a sessão vale é o servidor: enquanto
 * `GET /auth/me` não responde, mostramos o spinner; se responder erro (401,
 * cookie ausente ou expirado), manda para /login.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"verificando" | "autenticado">("verificando");

  useEffect(() => {
    let cancelado = false;

    getMe()
      .then((user) => {
        if (cancelado) return;
        // Mantém o cache de primeira pintura em dia com o servidor.
        saveUser(user);
        setStatus("autenticado");
      })
      .catch(() => {
        if (cancelado) return;
        // Cache local não pode sobreviver a uma sessão inválida.
        clearStoredUser();
        router.replace("/login");
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  if (status === "verificando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0EC]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
