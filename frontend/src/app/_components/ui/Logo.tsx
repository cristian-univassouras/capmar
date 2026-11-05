import Link from "next/link";

/** Marca CapMar: um azulejo de quatro folhas (cobalto, teal, sol, terracota) e o nome numa palavra só. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="12" height="12" rx="3" fill="#1b4fa8" />
      <rect x="15" y="1" width="12" height="12" rx="3" fill="#0e7c86" />
      <rect x="1" y="15" width="12" height="12" rx="3" fill="#f2b33d" />
      <rect x="15" y="15" width="12" height="12" rx="3" fill="#c4492a" />
      <circle cx="7" cy="7" r="2.6" fill="#fffdf8" />
      <circle cx="21" cy="21" r="2.6" fill="#fffdf8" />
    </svg>
  );
}

export function Logo({ href = "/", subtitle, className = "" }: { href?: string; subtitle?: string; className?: string }) {
  return (
    <Link href={href} aria-label="CapMar, página inicial" className={`inline-flex min-h-11 items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="grid leading-none">
        <span className="font-heading text-[24px] font-extrabold tracking-tight text-secondary">CapMar</span>
        {subtitle && <span className="mt-1 font-sans text-[13px] font-medium tracking-normal text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}
