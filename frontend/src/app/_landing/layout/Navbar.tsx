"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/home", label: "Explorar projetos" }, { href: "/#features", label: "Destaques" },
  { href: "/ajuda", label: "Ajuda" }, { href: "/sobre", label: "Sobre" },
];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);
  return <header ref={container} className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
    <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link href="/" className="shrink-0 font-heading text-xl font-black text-primary sm:text-2xl">CapMar</Link>
      <nav aria-label="Navegação principal" className="hidden items-center gap-5 text-sm font-semibold lg:flex">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
        <Link href="/login" className="text-primary">Entrar</Link>
        <Link href="/register" className="rounded-xl bg-primary px-3 py-3 text-white sm:px-4">Criar conta</Link>
        <button ref={toggle} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(!open)} className="shrink-0 rounded-xl p-2 lg:hidden">{open ? <X /> : <Menu />}</button>
      </div>
    </div>
    {open && <nav id="landing-menu" aria-label="Menu móvel" className="grid max-h-[70dvh] overflow-auto border-t border-gray-100 bg-white p-4 lg:hidden">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-gray-50">{link.label}</Link>)}</nav>}
  </header>;
}
