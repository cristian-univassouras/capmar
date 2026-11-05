"use client";
import { useEffect, useRef, useState } from "react";
import { getOptionalMe, getStoredUser } from "./api";

/** Revalida páginas públicas que também apresentam dados privados da sessão. */
export function useSessionRevision() {
  const [revision, setRevision] = useState(0);
  const identity = useRef<number | null>(getStoredUser()?.user_id ?? null);
  useEffect(() => {
    let active = true;
    function update(id: number | null) {
      if (active && identity.current !== id) {
        identity.current = id;
        setRevision((n) => n + 1);
      }
    }
    const changed = () => update(getStoredUser()?.user_id ?? null);
    const stored = (event: StorageEvent) => { if (event.key === "capmar_user" || event.key === null) changed(); };
    const focused = () => { void getOptionalMe().then((me) => update(me?.user_id ?? null)).catch(() => {}); };
    window.addEventListener("storage", stored);
    window.addEventListener("capmar-user-changed", changed);
    window.addEventListener("focus", focused);
    return () => {
      active = false;
      window.removeEventListener("storage", stored);
      window.removeEventListener("capmar-user-changed", changed);
      window.removeEventListener("focus", focused);
    };
  }, []);
  return revision;
}
