import Link from "next/link";

/** Marca CapMar: sol baixo sobre ondas da lagoa, num quadrado cobalto. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#1b4fa8" />
      <circle cx="21.5" cy="11.5" r="4.5" fill="#f2b33d" />
      <path d="M5 19.5c2.6 0 2.6-2 5.2-2s2.6 2 5.2 2 2.6-2 5.2-2 2.6 2 6.4 2" fill="none" stroke="#fffdf8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 25c2.6 0 2.6-2 5.2-2s2.6 2 5.2 2 2.6-2 5.2-2 2.6 2 6.4 2" fill="none" stroke="#fffdf8" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

type LogoProps = { href?: string; subtitle?: string; className?: string; tone?: "dark" | "light" };

export function Logo({ href = "/", subtitle, className = "", tone = "dark" }: LogoProps) {
  const light = tone === "light";
  return (
    <Link href={href} aria-label="CapMar, página inicial" className={`inline-flex min-h-11 items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="grid leading-none">
        <span className={`font-heading text-[23px] font-extrabold tracking-[-0.03em] ${light ? "text-white" : "text-secondary"}`}>
          Cap<span className={light ? "text-[#9fc0f5]" : "text-primary"}>Mar</span>
        </span>
        {subtitle && <span className={`mt-1 font-sans text-[13px] font-medium tracking-normal ${light ? "text-[#cfe0e6]" : "text-muted"}`}>{subtitle}</span>}
      </span>
    </Link>
  );
}
