"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Compass, Newspaper, FolderKanban, Users, MessagesSquare, ShieldCheck, UserRound, HelpCircle, LogOut, MoreHorizontal, Search, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { clearSession, getStoredUser, type User } from "@/lib/api";
import { Avatar } from "@/app/_components/media";
import { Logo, LogoMark } from "@/app/_components/ui/Logo";

const items = [
  { href: "/home", label: "Explorar", icon: Compass },
  { href: "/feed", label: "Publicações", icon: Newspaper },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/equipes", label: "Equipes", icon: Users },
  { href: "/chat", label: "Mensagens", icon: MessagesSquare },
];

/* Rótulo dinâmico da última parte do caminho (ex.: "Perfil de @ana", nome do projeto).
   As páginas chamam setShellCrumb(label) quando conhecem o nome; vale só para a rota atual. */
type Crumb = { path: string; label: string } | null;
let announced: Crumb = null;
const listeners = new Set<() => void>();
export function setShellCrumb(label: string | null) {
  announced = label == null || typeof window === "undefined" ? null : { path: window.location.pathname, label };
  listeners.forEach((fn) => fn());
}
function subscribeCrumb(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

type Trail = { label: string; href?: string }[];
function trailFor(path: string, dynamic: string | null): Trail {
  const root = { label: "Comunidade", href: "/home" };
  if (path.startsWith("/usuario/")) return [root, { label: "Explorar", href: "/home" }, { label: dynamic ?? "Perfil" }];
  if (path.startsWith("/projeto/")) return [root, { label: "Projetos", href: "/projetos" }, { label: dynamic ?? "Projeto" }];
  if (path.startsWith("/equipe/")) return [root, { label: "Equipes", href: "/equipes" }, { label: dynamic ?? "Equipe" }];
  if (path === "/seguranca") return [root, { label: "Meu perfil", href: "/perfil" }, { label: "Segurança" }];
  if (path === "/perfil") return [root, { label: "Meu perfil" }];
  if (path === "/admin") return [root, { label: "Administração" }];
  const item = items.find((i) => i.href === path);
  return [root, { label: item?.label ?? "Minha conta" }];
}

/** Rotas em que a busca do cabeçalho de fato procura projetos (Explorar e Projetos têm a própria busca na página). */
const SEARCH_PATHS = ["/feed"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [error, setError] = useState("");
  const menu = useRef<HTMLDialogElement>(null);
  const crumb = useSyncExternalStore(subscribeCrumb, () => announced, () => null);
  useEffect(() => {
    const update = () => setUser(getStoredUser());
    window.addEventListener("capmar-user-changed", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("capmar-user-changed", update); window.removeEventListener("storage", update); };
  }, []);
  useEffect(() => { if (menu.current?.open) menu.current.close(); }, [path]);

  const active = (href: string) => path === href || (href === "/projetos" && path.startsWith("/projeto/")) || (href === "/equipes" && path.startsWith("/equipe/"));
  const trail = trailFor(path, crumb && crumb.path === path ? crumb.label : null);
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Minha conta";
  async function logout() {
    try { await clearSession(); menu.current?.close(); router.replace("/login"); }
    catch { setError("Não foi possível sair. Confira sua conexão e tente novamente."); }
  }
  const linkClass = (href: string) => "workspace-link " + (active(href) ? "is-active" : "");
  const moreItems = [
    { href: "/equipes", label: "Equipes", icon: Users },
    { href: "/perfil", label: "Meu perfil", icon: UserRound },
    { href: "/seguranca", label: "Segurança", icon: ShieldCheck },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Administração", icon: SlidersHorizontal }] : []),
    { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
  ];
  const moreActive = moreItems.some((i) => i.href !== "/ajuda" && active(i.href)) || path.startsWith("/usuario/");

  return <div className="workspace">
    <a href="#main-content" className="skip-link">Ir para o conteúdo</a>
    <aside className="workspace-sidebar">
      <div className="px-2 pb-6"><Logo href="/home" subtitle="Projetos de Maricá" /></div>
      <p className="workspace-nav-label">Comunidade</p>
      <nav aria-label="Menu principal" className="space-y-1">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={linkClass(href)}><Icon size={20} aria-hidden="true" />{label}</Link>)}</nav>
      <nav aria-label="Sua conta" className="workspace-account space-y-1">
        <Link href="/perfil" aria-current={path === "/perfil" ? "page" : undefined} className={linkClass("/perfil")}><UserRound size={19} aria-hidden="true" />Meu perfil</Link>
        <Link href="/seguranca" aria-current={path === "/seguranca" ? "page" : undefined} className={linkClass("/seguranca")}><ShieldCheck size={19} aria-hidden="true" />Segurança</Link>
        {user?.role === "admin" && <Link href="/admin" aria-current={path === "/admin" ? "page" : undefined} className={linkClass("/admin")}><SlidersHorizontal size={19} aria-hidden="true" />Administração</Link>}
        <Link href="/ajuda" className="workspace-link"><HelpCircle size={19} aria-hidden="true" />Ajuda</Link>
      </nav>
      <div className="workspace-identity">
        <Link href="/perfil" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl"><Avatar user={user} className="h-10 w-10 shrink-0" /><span className="min-w-0"><strong className="block truncate text-sm" title={name}>{name}</strong><span className="block truncate text-[13px] text-muted">{user ? "@" + user.username : ""}</span></span></Link>
        <button onClick={logout} aria-label="Sair" title="Sair" className="ui-icon-button"><LogOut size={18} aria-hidden="true" /></button>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/home" aria-label="CapMar, página inicial" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center md:hidden"><LogoMark size={30} /></Link>
          <nav aria-label="Você está em" className="min-w-0">
            <ol className="flex min-w-0 items-center text-sm text-muted">
              {trail.map((part, i) => {
                const last = i === trail.length - 1;
                return <Fragment key={part.label + i}>
                  {i > 0 && <li aria-hidden="true" className="hidden shrink-0 px-1 md:block"><ChevronRight size={14} /></li>}
                  <li className={"min-w-0 " + (i === 0 || (!last && trail.length > 2) ? "hidden md:block" : "") + (last ? " truncate font-semibold text-secondary" : "")}>
                    {part.href && !last
                      ? <Link href={part.href} className="inline-flex min-h-11 items-center rounded-lg px-1.5 hover:text-primary">{part.label}</Link>
                      : <span aria-current={last ? "page" : undefined} className={last ? "block truncate px-1.5" : "px-1.5"}>{part.label}</span>}
                  </li>
                </Fragment>;
              })}
            </ol>
          </nav>
        </div>
        {SEARCH_PATHS.includes(path) && <form action="/home" role="search" className="workspace-search"><Search size={17} aria-hidden="true" /><input name="q" aria-label="Buscar projetos" placeholder="Buscar projetos" maxLength={100} className="min-h-11" /><button type="submit" style={{ minHeight: 44 }}>Buscar</button></form>}
        <Link href="/perfil" aria-label="Meu perfil" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center md:hidden"><Avatar user={user} className="h-9 w-9" /></Link>
      </header>
      {error && <p role="alert" className="ui-error m-4">{error}</p>}
      <main id="main-content" className="workspace-main"><div key={path} className="page-enter">{children}</div></main>
    </div>
    <nav aria-label="Menu principal móvel" className="workspace-mobile">
      {items.filter((i) => i.href !== "/equipes").map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "is-active" : ""}><Icon size={21} aria-hidden="true" /><span>{label}</span></Link>)}
      <button aria-haspopup="dialog" onClick={() => menu.current?.showModal()} className={moreActive ? "is-active" : ""}><MoreHorizontal size={21} aria-hidden="true" /><span>Mais</span></button>
    </nav>
    <dialog
      ref={menu}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-menu-title"
      className="ui-dialog workspace-mobile-dialog"
      style={{ margin: 0, inset: "auto 12px 84px", width: "calc(100% - 24px)", maxWidth: "none", padding: 20 }}
      onClick={(e) => { if (e.target === menu.current) menu.current?.close(); }}
    >
      <div className="flex items-center justify-between"><h2 id="account-menu-title" className="font-heading text-xl font-bold text-secondary">Sua comunidade</h2><button aria-label="Fechar menu" onClick={() => menu.current?.close()} className="ui-icon-button"><X size={20} aria-hidden="true" /></button></div>
      <nav aria-label="Mais opções" className="mt-3 grid gap-1">
        {moreItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => menu.current?.close()} className={linkClass(href)}><Icon size={20} aria-hidden="true" />{label}</Link>)}
        <button onClick={logout} className="workspace-link"><LogOut size={20} aria-hidden="true" />Sair</button>
      </nav>
    </dialog>
  </div>;
}
