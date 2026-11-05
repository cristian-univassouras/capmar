import Link from "next/link";
import { Logo } from "@/app/_components/ui/Logo";
import { TileStrip } from "@/app/_components/ui/primitives";

const link = "inline-flex min-h-11 items-center text-[15px] text-gray-600 hover:text-primary hover:underline";

export default function Footer() {
  return (
    <footer className="mt-16">
      <TileStrip />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[15px] text-muted">Feito em Maricá, para Maricá. Um projeto de extensão de estudantes de Engenharia de Software da Universidade de Vassouras, campus Maricá.</p>
        </div>
        <nav aria-label="Rodapé: plataforma" className="grid content-start">
          <Link href="/home" className={link}>Explorar projetos</Link>
          <Link href="/projetos" className={link}>Apresentar meu projeto</Link>
          <Link href="/register" className={link}>Criar conta</Link>
        </nav>
        <nav aria-label="Rodapé: institucional" className="grid content-start">
          <Link href="/sobre" className={link}>Sobre o CapMar</Link>
          <Link href="/ajuda" className={link}>Ajuda</Link>
          <a href="mailto:capmar.dev@gmail.com" className={link}>capmar.dev@gmail.com</a>
        </nav>
      </div>
    </footer>
  );
}
