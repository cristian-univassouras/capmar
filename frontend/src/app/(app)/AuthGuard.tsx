"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, clearStoredUser, getMe, saveUser } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    function expired() {
      clearStoredUser();
      setAuthed(false);
      router.replace("/login?next=" + encodeURIComponent(pathname));
    }
    async function check() {
      try {
        const user = await getMe();
        if (!active) return;
        saveUser(user);
        setError(false);
        setAuthed(true);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) expired();
        else { setAuthed(false); setError(true); }
      }
    }
    window.addEventListener("capmar-session-expired", expired);
    window.addEventListener("focus", check);
    void check();
    return () => {
      active = false;
      window.removeEventListener("capmar-session-expired", expired);
      window.removeEventListener("focus", check);
    };
  }, [router, pathname, attempt]);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0EC]">
        {error ? <button onClick={() => setAttempt((value) => value + 1)}>
          Não foi possível confirmar a sessão. Tentar novamente
        </button> : <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />}
      </div>
    );
  }
  return <>{children}</>;
}
