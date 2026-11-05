"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { getOptionalMe } from "@/lib/api";
export default function CommunityCTA(){
  const [signed,setSigned]=useState(false);
  useEffect(()=>{getOptionalMe().then(me=>setSigned(Boolean(me))).catch(()=>{});},[]);
  return <aside className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] bg-primary px-6 py-9 text-white sm:px-10">
    <div>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight">Seu projeto também tem lugar aqui.</h2>
      <p className="mt-3 max-w-lg text-base text-[#dbe6f7]">Apresente sua iniciativa, mostre quem faz e deixe a cidade encontrar você.</p>
    </div>
    <Link href={signed?"/projetos":"/register"} className="ui-button !border-white !bg-white !text-primary-strong hover:!bg-primary-soft">{signed?"Cadastrar um projeto":"Criar minha conta"}<ArrowUpRight size={18} aria-hidden="true"/></Link>
  </aside>;
}
