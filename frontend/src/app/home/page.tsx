"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getStoredUser,
  listCategories,
  listProjects,
  mediaUrl,
  type Category,
  type Project,
  type User,
} from "@/lib/api";
import { Avatar } from "@/app/_components/media";

const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  ativo: "bg-emerald-100 text-emerald-700",
  pausado: "bg-amber-100 text-amber-700",
  concluido: "bg-blue-100 text-blue-700",
};

export default function PublicHomePage() {
  const [me, setMe] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMe(getStoredUser());
    Promise.all([listProjects(), listCategories()])
      .then(([p, c]) => {
        setProjects(p.filter((proj) => proj.visibility));
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (active === "all" ? projects : projects.filter((p) => p.category_id === active)),
    [projects, active]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-black text-2xl text-primary tracking-tight">
            CapMar
          </Link>
          <div className="flex items-center gap-3">
            {me ? (
              <>
                <Link href="/feed" className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  Ir para o app
                </Link>
                <Link href="/perfil" title="Meu perfil">
                  <Avatar user={me} className="w-9 h-9 text-sm" />
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden md:block text-sm font-semibold text-gray-600 hover:text-primary transition-colors">
                  Entrar
                </Link>
                <Link href="/register" className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  Começar grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-10">
        <div className="text-center space-y-4 py-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded-full tracking-wide uppercase">
            Projetos em destaque
          </span>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight">
            Descubra o que está sendo<br className="hidden md:block" /> construído em Maricá
          </h1>
          <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
            Conecte-se com criadores locais, acompanhe projetos reais e faça parte da próxima geração de empreendedores.
          </p>
        </div>

        {/* Filtros por categoria (reais) */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
            <button
              onClick={() => setActive("all")}
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
                active === "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActive(cat.id)}
                className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
                  active === cat.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {cat.description}
              </button>
            ))}
          </div>
        )}

        {/* Grid de projetos */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            Nenhum projeto público por aqui ainda.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <Link
                key={project.project_id}
                href={`/projeto/${project.project_id}`}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="relative h-28 bg-gradient-to-br from-primary/15 to-secondary/15 flex items-end p-4">
                  {mediaUrl(project.cover_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(project.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="relative w-12 h-12 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center font-heading font-black text-lg text-primary">
                    {mediaUrl(project.logo_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(project.logo_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      project.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {project.category?.description ?? "Sem categoria"}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl capitalize ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      {project.likes_count}
                    </span>
                    <span className="ml-auto text-sm font-semibold text-primary group-hover:underline">Ver mais →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-white space-y-4">
          <h2 className="font-heading font-black text-3xl md:text-4xl">Tem um projeto? Mostre para o mundo.</h2>
          <p className="text-white/70 max-w-md mx-auto">
            Cadastre seu projeto, monte sua equipe e conecte-se com outros criadores de Maricá.
          </p>
          <Link
            href={me ? "/projetos" : "/register"}
            className="inline-block bg-white text-primary font-semibold text-sm px-8 py-3 rounded-xl hover:bg-white/90 transition-colors mt-2"
          >
            {me ? "Cadastrar um projeto" : "Criar minha conta grátis"}
          </Link>
        </div>
      </main>
    </div>
  );
}
