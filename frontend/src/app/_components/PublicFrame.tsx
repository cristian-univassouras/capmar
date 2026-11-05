"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import AppShell from "@/app/(app)/AppShell";
import PublicHeader from "./PublicHeader";
import Footer from "@/app/_landing/layout/Footer";
import { getOptionalMe, getStoredUser, saveUser } from "@/lib/api";
import { useSessionRevision } from "@/lib/use-session-revision";

function subscribeStored(fn: () => void) {
  window.addEventListener("capmar-user-changed", fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener("capmar-user-changed", fn); window.removeEventListener("storage", fn); };
}
const hasStoredUser = () => getStoredUser() !== null;

/** Mantém o contexto da comunidade quando uma página pública é aberta com sessão.
 *  Usa o usuário guardado para pintar a casca certa de imediato (sem piscar o cabeçalho público)
 *  e confirma a sessão em seguida. */
export default function PublicFrame({children,className="max-w-6xl"}:{children:React.ReactNode;className?:string}){
  const stored=useSyncExternalStore(subscribeStored,hasStoredUser,()=>false);
  const [verified,setVerified]=useState<boolean|null>(null);
  const revision=useSessionRevision();
  useEffect(()=>{let active=true;getOptionalMe().then(user=>{if(active){setVerified(Boolean(user));if(user)saveUser(user);}}).catch(()=>{});return()=>{active=false;};},[revision]);
  const content=<div className={"mx-auto min-w-0 space-y-6 "+className}>{children}</div>;
  const inApp=verified??stored;
  return inApp?<AppShell>{content}</AppShell>:<div className="min-h-screen bg-background"><PublicHeader/><main className="page-enter px-4 py-8 sm:px-6">{content}</main><Footer/></div>;
}
