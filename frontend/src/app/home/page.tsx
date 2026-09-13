import Link from "next/link";
import { Suspense } from "react";
import PublicHeader from "@/app/_components/PublicHeader";
import ProjectBrowser from "@/app/_components/ProjectBrowser";

export default function PublicHomePage() {
  return <div className="min-h-screen bg-background">
    <PublicHeader />
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4 py-4 text-center">
        <p className="font-semibold text-primary">Vitrine de projetos</p>
        <h1 className="font-heading text-3xl font-black sm:text-5xl">Descubra o que está sendo construído em Maricá</h1>
        <p className="text-gray-600">Conheça os projetos, suas equipes e ideias. Explore sem precisar entrar.</p>
      </div>
      <Suspense fallback={<p role="status">Carregando vitrine...</p>}><ProjectBrowser publicOnly /></Suspense>
      <div className="space-y-4 rounded-2xl bg-primary p-6 text-center text-white sm:p-10">
        <h2 className="font-heading text-3xl font-bold">Tem um projeto? Mostre para a comunidade.</h2>
        <p>Crie sua conta para cadastrar projetos, comentar e participar.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link className="rounded-xl bg-white px-6 py-3 font-semibold text-primary" href="/register">Criar conta</Link>
          <Link className="rounded-xl border border-white px-6 py-3 font-semibold" href="/projetos">Cadastrar um projeto</Link>
        </div>
      </div>
    </main>
  </div>;
}
