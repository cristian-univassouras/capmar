"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { getOptionalMe } from "@/lib/api";
export default function CommunityCTA(){
  const [signed,setSigned]=useState(false);
  useEffect(()=>{getOptionalMe().then(me=>setSigned(Boolean(me))).catch(()=>{});},[]);
  return <aside className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-primary px-6 py-8 text-white sm:px-9"><div><p className="text-xs font-semibold uppercase tracking-widest text-white/60">Da ideia à comunidade</p><h2 className="mt-2 font-heading text-2xl font-bold">Seu projeto também tem lugar aqui.</h2><p className="mt-2 max-w-lg text-sm text-white/75">Apresente sua iniciativa, compartilhe os próximos passos e encontre pessoas para construir junto.</p></div><Link href={signed?"/projetos":"/register"} className="ui-button border-white bg-white text-primary">{signed?"Cadastrar um projeto":"Criar minha conta"} <span aria-hidden="true">↗</span></Link></aside>;
}
