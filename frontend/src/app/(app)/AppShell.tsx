"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Compass, Newspaper, FolderKanban, Users, MessagesSquare, ShieldCheck, UserRound, HelpCircle, LogOut, MoreHorizontal, Search, X } from "lucide-react";
import { clearSession, getStoredUser, type User } from "@/lib/api";
import { Avatar } from "@/app/_components/media";

const items=[{href:"/home",label:"Explorar",icon:Compass},{href:"/feed",label:"Publicações",icon:Newspaper},{href:"/projetos",label:"Projetos",icon:FolderKanban},{href:"/equipes",label:"Equipes",icon:Users},{href:"/chat",label:"Mensagens",icon:MessagesSquare}];
export default function AppShell({children}:{children:React.ReactNode}){
  const path=usePathname(),router=useRouter();
  const [user,setUser]=useState<User|null>(getStoredUser);
  const [error,setError]=useState("");
  const menu=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const update=()=>setUser(getStoredUser());window.addEventListener("capmar-user-changed",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("capmar-user-changed",update);window.removeEventListener("storage",update);};},[]);
  const active=(href:string)=>path===href||(href==="/projetos"&&path.startsWith("/projeto/"))||(href==="/equipes"&&path.startsWith("/equipe/"));
  const title=items.find(i=>active(i.href))?.label??(path==="/seguranca"?"Segurança":path==="/admin"?"Administração":"Minha conta");
  const name=[user?.first_name,user?.last_name].filter(Boolean).join(" ")||user?.username||"Minha conta";
  async function logout(){try{await clearSession();menu.current?.close();router.replace("/login");}catch{setError("Não foi possível sair. Confira sua conexão e tente novamente.");}}
  const linkClass=(href:string)=>"workspace-link "+(active(href)?"is-active":"");
  return <div className="workspace">
    <a href="#main-content" className="skip-link">Ir para o conteúdo</a>
    <aside className="workspace-sidebar">
      <Link href="/home" className="workspace-brand">CapMar<span>Projetos de Maricá</span></Link>
      <p className="workspace-nav-label">Comunidade</p>
      <nav aria-label="Menu principal" className="space-y-1">{items.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={active(href)?"page":undefined} className={linkClass(href)}><Icon size={20}/>{label}</Link>)}</nav>
      <nav aria-label="Sua conta" className="workspace-account space-y-1">
        <Link href="/perfil" className={linkClass("/perfil")}><UserRound size={19}/>Meu perfil</Link>
        <Link href="/seguranca" className={linkClass("/seguranca")}><ShieldCheck size={19}/>Segurança</Link>
        {user?.role==="admin"&&<Link href="/admin" className={linkClass("/admin")}><FolderKanban size={19}/>Administração</Link>}
        <Link href="/ajuda" className="workspace-link"><HelpCircle size={19}/>Ajuda</Link>
      </nav>
      <div className="workspace-identity"><Link href="/perfil" className="flex min-w-0 flex-1 items-center gap-3"><Avatar user={user} className="h-10 w-10 shrink-0"/><span className="min-w-0"><strong className="block truncate text-sm" title={name}>{name}</strong><span className="block truncate text-xs text-gray-500">@{user?.username}</span></span></Link><button onClick={logout} aria-label="Sair" title="Sair" className="ui-icon-button"><LogOut size={18}/></button></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header"><div className="flex min-w-0 items-center gap-3"><Link href="/home" className="font-heading text-xl font-black text-primary md:hidden">CapMar</Link><span className="hidden text-sm text-gray-500 md:inline">Comunidade <span className="px-2 text-gray-300">/</span><span className="font-semibold text-primary">{title}</span></span></div>
        {!path.startsWith("/projetos")&&path!=="/home"&&<form action="/home" role="search" className="workspace-search"><Search size={17} aria-hidden="true"/><input name="q" aria-label="Buscar projetos" placeholder="Buscar projetos" maxLength={100}/><button type="submit">Buscar</button></form>}
        <Link href="/perfil" aria-label="Meu perfil" className="shrink-0 md:hidden"><Avatar user={user} className="h-9 w-9"/></Link>
      </header>
      {error&&<p role="alert" className="m-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <main id="main-content" className="workspace-main">{children}</main>
    </div>
    <nav aria-label="Menu principal móvel" className="workspace-mobile">{items.filter(i=>i.href!=="/equipes").map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={active(href)?"page":undefined} className={active(href)?"is-active":""}><Icon size={21}/><span>{label}</span></Link>)}<button aria-haspopup="dialog" onClick={()=>menu.current?.showModal()}><MoreHorizontal size={21}/><span>Mais</span></button></nav>
    <dialog ref={menu} aria-labelledby="account-menu-title" className="workspace-mobile-dialog"><div className="flex items-center justify-between"><h2 id="account-menu-title" className="font-heading text-xl font-bold text-primary">Sua comunidade</h2><button aria-label="Fechar menu" onClick={()=>menu.current?.close()} className="ui-icon-button"><X size={20}/></button></div><nav aria-label="Mais opções" className="mt-4 grid gap-1">{[{href:"/equipes",label:"Equipes",icon:Users},{href:"/perfil",label:"Meu perfil",icon:UserRound},{href:"/seguranca",label:"Segurança",icon:ShieldCheck},...(user?.role==="admin"?[{href:"/admin",label:"Administração",icon:FolderKanban}]:[]),{href:"/ajuda",label:"Ajuda",icon:HelpCircle}].map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>menu.current?.close()} className="workspace-link"><Icon size={20}/>{label}</Link>)}<button onClick={logout} className="workspace-link"><LogOut size={20}/>Sair</button></nav></dialog>
  </div>;
}
