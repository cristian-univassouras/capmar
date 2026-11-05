"use client";
import Link from "next/link";
import { EmptyState } from "@/app/_components/ui/primitives";

export default function ProjectError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-4 py-12">
    <EmptyState title="Não foi possível carregar o projeto" action={<div className="flex flex-wrap justify-center gap-3"><button onClick={reset} className="ui-button ui-button-primary">Tentar novamente</button><Link href="/home" className="ui-button">Voltar à vitrine</Link></div>}>
      O servidor pode estar indisponível. Tente novamente em instantes.
    </EmptyState>
  </main>;
}
