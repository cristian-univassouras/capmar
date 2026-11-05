"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** Bloco de carregamento com brilho suave. Decorativo: o status fica no aria-busy do contêiner. */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

export function ProjectCardSkeleton() {
  return (
    <div className="project-card" aria-hidden="true">
      <Skeleton className="aspect-[16/10] w-full !rounded-none" />
      <div className="grid gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando projetos" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => <ProjectCardSkeleton key={i} />)}
    </div>
  );
}

export function ListSkeleton({ rows = 4, label = "Carregando" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ui-panel flex items-center gap-4 p-4" aria-hidden="true">
          <Skeleton className="h-11 w-11 !rounded-full" />
          <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-4/5" /></div>
        </div>
      ))}
    </div>
  );
}

/** Estado vazio com a capivara e uma ação clara. */
export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ui-empty">
      <Image src="/cute_capybara.png" alt="" width={104} height={104} className="h-[104px] w-[104px] object-contain" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Revela o conteúdo ao entrar na tela. Sem JS ou com movimento reduzido, fica visível. */
export function Reveal({ children, index = 0, className = "", as: Tag = "div" }: { children: React.ReactNode; index?: number; className?: string; as?: "div" | "section" | "li" | "article" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Component = Tag as React.ElementType;
  return <Component ref={ref} className={`reveal ${className}`} style={{ ["--i" as string]: index }}>{children}</Component>;
}

const TILES = ["tile-a", "tile-b", "tile-c", "tile-d", "tile-e"] as const;
function hash(text: string) { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0; return h; }

/** Capa de projeto sem imagem: um azulejo escolhido pela categoria, sempre o mesmo para o mesmo projeto. */
export function TileCover({ seed, label, className = "" }: { seed: string; label?: string; className?: string }) {
  const tile = TILES[hash(seed || "capmar") % TILES.length];
  return (
    <div className={`tile ${tile} flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label ? `Capa de ${label}` : "Capa padrão do projeto"}>
      <span className="rounded-[10px] bg-surface px-3.5 py-1.5 font-heading text-lg font-extrabold tracking-tight text-secondary">CapMar</span>
    </div>
  );
}

/** Faixa de azulejo usada como separador entre seções públicas. */
export function TileStrip({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`tile-strip ${className}`} />;
}
