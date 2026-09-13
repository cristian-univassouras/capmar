"use client";
import Link from "next/link";
export default function ProjectError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-bold">Não foi possível carregar o projeto</h1><p>O servidor pode estar indisponível. Tente novamente em instantes.</p><button onClick={reset} className="rounded-xl bg-primary px-5 py-3 text-white">Tentar novamente</button><Link href="/home" className="block text-primary underline">Voltar à vitrine</Link></main>;
}
