import Link from "next/link";
export default function Footer() {
  return <footer className="relative z-20 border-t border-black/10 px-6 py-10">
    <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 sm:flex-row">
      <div><p className="font-heading text-2xl font-bold">CapMar</p><p className="mt-2 text-sm text-gray-600">Projetos e pessoas que transformam Maricá.</p></div>
      <nav aria-label="Links do rodapé" className="flex flex-wrap gap-5 text-sm font-semibold">
        <Link href="/home">Explorar projetos</Link><Link href="/register">Criar conta</Link>
        <Link href="/login">Entrar</Link><Link href="/ajuda">Central de ajuda</Link><Link href="/sobre">Sobre o CapMar</Link>
      </nav>
    </div>
    <p className="mx-auto mt-8 max-w-6xl text-xs text-gray-600">© {new Date().getFullYear()} CapMar.</p>
  </footer>;
}
