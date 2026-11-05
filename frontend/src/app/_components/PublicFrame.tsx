"use client";
import { useEffect, useState } from "react";
import AppShell from "@/app/(app)/AppShell";
import PublicHeader from "./PublicHeader";
import { getOptionalMe, saveUser, type User } from "@/lib/api";
import { useSessionRevision } from "@/lib/use-session-revision";

/** Mantém o contexto da comunidade quando uma página pública é aberta com sessão. */
export default function PublicFrame({children,className="max-w-6xl"}:{children:React.ReactNode;className?:string}){
  const [me,setMe]=useState<User|null>(null);
  const revision=useSessionRevision();
  useEffect(()=>{let active=true;getOptionalMe().then(user=>{if(active){setMe(user);if(user)saveUser(user);}}).catch(()=>{});return()=>{active=false;};},[revision]);
  const content=<div className={"mx-auto min-w-0 space-y-6 "+className}>{children}</div>;
  return me?<AppShell>{content}</AppShell>:<div className="min-h-screen bg-background"><PublicHeader/><main className="px-4 py-8 sm:px-6">{content}</main></div>;
}
