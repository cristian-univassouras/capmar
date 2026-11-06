"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { getOptionalMe, type User } from "@/lib/api";
import { useSessionRevision } from "@/lib/use-session-revision";
import { Logo } from "@/app/_components/ui/Logo";

const links = [
  { href: "/home", label: "Explorar projetos" },
  { href: "/descobrir", label: "Descobrir" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/sobre", label: "Sobre" },
  { href: "/ajuda", label: "Ajuda" },
];

const linkClass = "inline-flex min-h-11 items-center rounded-[10px] px-3 text-[15px] font-semibold text-gray-600 transition-colors hover:bg-surface-2 hover:text-primary";

/** Cabeçalho público único: landing, vitrine, sobre, ajuda e páginas públicas de projeto e perfil. */
export default function PublicHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const revision = useSessionRevision();
  const pathname = usePathname();
  const container = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    getOptionalMe().then((me) => { if (active) setUser(me); }).catch(() => {});
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);

  const current = (href: string) => (href === "/home" ? pathname === "/home" : href.startsWith("/#") ? false : pathname === href);
  const actions = user
    ? [{ href: "/feed", label: "Comunidade", primary: false }, { href: "/projetos", label: "Meus projetos", primary: true }]
    : [{ href: "/login", label: "Entrar", primary: false }, { href: "/register", label: "Criar conta", primary: true }];

  return (
    <header ref={container} className="sticky top-0 z-40 border-b border-line bg-background">
      <div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined} className={linkClass + (current(link.href) ? " !text-primary-strong bg-primary-soft" : "")}>{link.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={actions[0].href} className="ui-button ui-button-quiet max-sm:hidden!">{actions[0].label}</Link>
          <Link href={actions[1].href} className="ui-button ui-button-primary">{actions[1].label}</Link>
          <button
            ref={toggle}
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="menu-publico"
            onClick={() => setOpen(!open)}
            className="ui-icon-button lg:hidden!"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <nav
        id="menu-publico"
        aria-label="Menu móvel"
        aria-hidden={!open}
        className={"absolute inset-x-0 top-full grid max-h-[75dvh] overflow-auto border-b border-line bg-surface p-3 transition-[opacity,transform,visibility] duration-[220ms] ease-[var(--ease-out)] lg:hidden " + (open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={current(link.href) ? "page" : undefined} className="flex min-h-12 items-center rounded-[10px] px-3 text-base font-semibold text-secondary hover:bg-surface-2">{link.label}</Link>
        ))}
        <Link href={actions[0].href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-[10px] px-3 text-base font-semibold text-primary hover:bg-surface-2 sm:hidden">{actions[0].label}</Link>
      </nav>
    </header>
  );
}
