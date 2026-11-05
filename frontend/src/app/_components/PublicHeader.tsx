"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getOptionalMe, type User } from "@/lib/api";
import { useSessionRevision } from "@/lib/use-session-revision";

export default function PublicHeader() {
  const [user, setUser] = useState<User | null>(null);
  const revision = useSessionRevision();
  useEffect(() => {
    let active = true;
    getOptionalMe().then((me) => { if (active) setUser(me); }).catch(() => {});
    return () => { active = false; };
  }, [revision]);
  return <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
    <nav aria-label="Navegação pública" className="max-w-6xl mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <Link href="/home" className="font-heading text-2xl font-black text-primary">CapMar</Link>
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold"><Link href="/ajuda" className="hidden text-gray-500 sm:inline">Ajuda</Link><Link href="/sobre" className="hidden text-gray-500 sm:inline">Sobre</Link>
        {user ? <><Link href="/projetos">Meus projetos</Link><Link href="/perfil">Meu perfil</Link></> :
          <><Link href="/login" className="text-primary">Entrar</Link><Link href="/register" className="rounded-xl bg-primary px-4 py-2 text-white">Criar conta</Link></>}
      </div>
    </nav>
  </header>;
}
