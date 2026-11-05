"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { currentAuthDestination } from "@/lib/auth-navigation";
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
export default function AuthSwitchLink({ href, children }: { href: "/login" | "/register"; children: React.ReactNode }) {
  const next = useSyncExternalStore(subscribe, currentAuthDestination, () => null);
  return <Link href={href + (next ? "?next=" + encodeURIComponent(next) : "")} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">{children}</Link>;
}
