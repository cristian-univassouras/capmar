"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOptionalMe, saveUser } from "@/lib/api";
import { currentAuthDestination } from "@/lib/auth-navigation";

/** Quem já está logado não precisa ver login/cadastro: vai para o destino pedido (`next`) ou para o feed. */
export function useRedirectIfAuthenticated() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    getOptionalMe()
      .then((user) => {
        if (!active || !user) return;
        saveUser(user);
        router.replace(currentAuthDestination() ?? "/feed");
      })
      .catch(() => {});
    return () => { active = false; };
  }, [router]);
}
