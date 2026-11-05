"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, clearStoredUser, getMe, getStoredUser, saveUser } from "@/lib/api";
import { safeAuthDestination } from "@/lib/auth-navigation";
import { Logo } from "@/app/_components/ui/Logo";
import { ListSkeleton, Skeleton } from "@/app/_components/ui/primitives";

function subscribeStored(fn: () => void) {
  window.addEventListener("capmar-user-changed", fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener("capmar-user-changed", fn); window.removeEventListener("storage", fn); };
}
const hasStoredUser = () => getStoredUser() !== null;

/** Casca já pintada enquanto a sessão é confirmada: mesma estrutura do AppShell, sem spinner. */
function ShellSkeleton({ error, retry }: { error: boolean; retry: () => void }) {
  return (
    <div className="workspace" aria-busy={!error}>
      <aside className="workspace-sidebar">
        <div className="px-2 pb-6"><Logo href="/home" subtitle="Projetos de Maricá" /></div>
        <div className="grid gap-2 px-1">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full !rounded-xl" />)}</div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header"><Skeleton className="h-5 w-48" /></header>
        <main className="workspace-main">
          {error ? (
            <div role="alert" className="ui-panel mx-auto grid max-w-md justify-items-center gap-4 p-8 text-center">
              <h1 className="font-heading text-xl font-bold text-secondary">Não conseguimos confirmar sua sessão</h1>
              <p className="text-[15px] text-muted">Confira sua conexão e tente de novo.</p>
              <button className="ui-button ui-button-primary" onClick={retry}>Tentar novamente</button>
            </div>
          ) : (
            <><Skeleton className="mb-7 h-9 w-64" /><ListSkeleton rows={4} label="Carregando sua conta" /></>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  // Com usuário guardado a casca real aparece de imediato; o servidor continua sendo quem decide (401 expulsa).
  const stored = useSyncExternalStore(subscribeStored, hasStoredUser, () => false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Não depende do pathname: confirma a sessão uma vez (e ao voltar o foco), não a cada navegação.
  useEffect(() => {
    let active = true;
    function expired() {
      clearStoredUser();
      setVerified(false);
      const destination = safeAuthDestination(pathRef.current + window.location.search) ?? pathRef.current;
      router.replace("/login?next=" + encodeURIComponent(destination));
    }
    async function check() {
      try {
        const user = await getMe();
        if (!active) return;
        saveUser(user);
        setError(false);
        setVerified(true);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) expired();
        else { setVerified(false); setError(true); }
      }
    }
    window.addEventListener("capmar-session-expired", expired);
    window.addEventListener("focus", check);
    function storageChanged(event: StorageEvent) {
      if (event.key === "capmar_user" || event.key === null) {
        if (!event.newValue) expired();
        else void check();
      }
    }
    window.addEventListener("storage", storageChanged);
    void check();
    return () => {
      active = false;
      window.removeEventListener("capmar-session-expired", expired);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", storageChanged);
    };
  }, [router, attempt]);

  if (!stored && !verified) return <ShellSkeleton error={error} retry={() => setAttempt((value) => value + 1)} />;
  return <>{children}</>;
}
