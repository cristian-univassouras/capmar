"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, SearchX, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import {
  createProject,
  deleteProject,
  getStoredUser,
  listCategories,
  listProjects,
  type Category,
  type Project,
  type User,
} from "@/lib/api";

const STATUS_OPTIONS = ["rascunho", "ativo", "pausado", "concluido"] as const;

const STATUS_STYLES: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  ativo: "bg-tertiary/10 text-tertiary",
  pausado: "bg-accent/10 text-accent",
  concluido: "bg-primary/10 text-primary",
};

/** Espelha o mínimo exigido pelo backend (`crud._BUSCA_MIN_LEN`). */
const BUSCA_MIN_LEN = 2;

/** Janela do debounce do campo de busca, em milissegundos. */
const DEBOUNCE_MS = 300;

function TituloProjetos() {
  return (
    <div>
      <h1 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">
        Projetos
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Cadastre e gerencie os projetos da plataforma.
      </p>
    </div>
  );
}

/** Placeholders com a mesma altura dos cards, para a grade não "pular". */
function GradeSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 animate-pulse"
        >
          <div className="flex gap-2">
            <span className="h-6 w-20 rounded-full bg-gray-100" />
            <span className="h-6 w-24 rounded-full bg-gray-100" />
          </div>
          <div className="h-5 w-2/3 rounded bg-gray-100" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-5/6 rounded bg-gray-100" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
          </div>
          <div className="mt-auto pt-2 border-t border-gray-50 h-5" />
        </div>
      ))}
    </div>
  );
}

/**
 * `useSearchParams` exige um limite de Suspense acima dele: sem isso o build de
 * produção falha com "Missing Suspense boundary with useSearchParams" — ver
 * `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`.
 */
export default function ProjetosPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-6">
          <TituloProjetos />
          <GradeSkeleton />
        </div>
      }
    >
      <ProjetosConteudo />
    </Suspense>
  );
}

function ProjetosConteudo() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtros. `termo` acompanha o input a cada tecla; `termoBuscado` só muda
  // depois do debounce e é o que de fato vai para a API. Os valores iniciais
  // vêm da querystring, para a busca sobreviver a um refresh e poder ser
  // compartilhada por link.
  const [termo, setTermo] = useState(() => searchParams.get("q") ?? "");
  const [termoBuscado, setTermoBuscado] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [categoria, setCategoria] = useState(
    () => searchParams.get("categoria") ?? ""
  );
  // Incrementado pelo "Tentar novamente": entra na chave abaixo e força um
  // novo disparo mesmo com os filtros idênticos.
  const [tentativa, setTentativa] = useState(0);

  // Chave do filtro cujo resultado já está na tela. Enquanto ela difere da
  // chave atual, há requisição em voo — é assim que o estado de carregamento é
  // derivado, sem `setState` síncrono dentro de efeito.
  const [resultadoDe, setResultadoDe] = useState<string | null>(null);

  const termoDigitado = termoBuscado.trim();
  // Mesma regra do backend: termo curto demais não filtra nada.
  const termoAplicado =
    termoDigitado.length >= BUSCA_MIN_LEN ? termoDigitado : "";
  const chaveAtual = JSON.stringify([tentativa, termoAplicado, categoria]);

  const carregando = resultadoDe !== chaveAtual;
  const primeiraCarga = resultadoDe === null;
  const debouncePendente = termo.trim() !== termoDigitado;
  const buscando = carregando || debouncePendente;
  const temFiltro = termo.trim() !== "" || categoria !== "";
  // Skeleton só na primeira carga e no "tentar novamente"; nas buscas seguintes
  // a grade antiga fica na tela com um indicador discreto, para não piscar a
  // cada tecla.
  const mostrarSkeleton = carregando && (primeiraCarga || loadError !== null);

  useEffect(() => {
    setMe(getStoredUser());
  }, []);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {
        // Sem categorias o select fica só com "Todas as categorias"; a
        // listagem de projetos não depende disso.
      });
  }, []);

  // Debounce: cada tecla reinicia a contagem; só o último valor vira busca.
  useEffect(() => {
    const id = setTimeout(() => setTermoBuscado(termo), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [termo]);

  // Espelha os filtros na URL. `replace` (e não `push`) para não empilhar uma
  // entrada de histórico por tecla digitada.
  useEffect(() => {
    const params = new URLSearchParams();
    if (termoAplicado) params.set("q", termoAplicado);
    if (categoria) params.set("categoria", categoria);
    const alvo = params.toString();
    if (alvo === searchParams.toString()) return;
    router.replace(alvo ? `${pathname}?${alvo}` : pathname, { scroll: false });
  }, [termoAplicado, categoria, searchParams, pathname, router]);

  // Busca. Cada disparo aborta o anterior, de modo que uma resposta atrasada
  // nunca sobrescreva a de uma busca mais nova.
  useEffect(() => {
    const controller = new AbortController();
    const chave = chaveAtual;

    listProjects(
      {
        q: termoAplicado || undefined,
        category_id: categoria ? Number(categoria) : undefined,
      },
      controller.signal
    )
      .then((dados) => {
        if (controller.signal.aborted) return;
        setProjects(dados);
        setLoadError(null);
        setResultadoDe(chave);
      })
      .catch((err) => {
        // Requisição cancelada por uma busca mais nova não é erro: o resultado
        // dela simplesmente não pode encostar na tela.
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar.");
        setResultadoDe(chave);
      });

    return () => controller.abort();
  }, [termoAplicado, categoria, chaveAtual]);

  function limparFiltros() {
    setTermo("");
    setTermoBuscado("");
    setCategoria("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const categoryId = String(form.get("category_id"));
    try {
      const created = await createProject({
        name: String(form.get("name")),
        description: String(form.get("description")) || undefined,
        status: String(form.get("status")),
        visibility: form.get("visibility") === "on",
        category_id: categoryId ? Number(categoryId) : null,
      });
      setProjects((prev) => [created, ...prev]);
      setFormOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar projeto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este projeto?")) return;
    const prev = projects;
    setProjects((p) => p.filter((proj) => proj.project_id !== id));
    try {
      await deleteProject(id);
    } catch {
      setProjects(prev); // reverte em caso de falha
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <TituloProjetos />
        <button
          onClick={() => {
            setFormOpen((o) => !o);
            setFormError(null);
          }}
          className="shrink-0 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
        >
          {formOpen ? "Cancelar" : "+ Novo projeto"}
        </button>
      </div>

      {/* Formulário de criação */}
      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nome do projeto
            </label>
            <input
              name="name"
              required
              maxLength={100}
              placeholder="Ex: Peixaria do Zé"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Descrição
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Conte do que se trata o projeto..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Categoria
              </label>
              <select
                name="category_id"
                defaultValue=""
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                defaultValue="rascunho"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white capitalize"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="visibility"
              defaultChecked
              className="w-4 h-4 accent-primary"
            />
            Projeto visível publicamente
          </label>

          {formError && (
            <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Criar projeto"}
            </button>
          </div>
        </form>
      )}

      {/* Barra de busca e filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar projetos..."
            aria-label="Buscar projetos"
            className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-11 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {/* Indicador discreto: aparece durante o debounce e a requisição. */}
          {buscando && !mostrarSkeleton && (
            <LoaderCircle
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 animate-spin"
              aria-hidden
            />
          )}
        </div>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoria"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all sm:w-56"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.description}
            </option>
          ))}
        </select>

        {temFiltro && (
          <button
            type="button"
            onClick={limparFiltros}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-primary hover:border-primary/40 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
            Limpar
          </button>
        )}
      </div>

      {/* Contador */}
      {!mostrarSkeleton && !loadError && (
        <p className="text-sm text-gray-500" aria-live="polite">
          {projects.length === 1
            ? "1 projeto encontrado"
            : `${projects.length} projetos encontrados`}
        </p>
      )}

      {/* Lista */}
      {mostrarSkeleton ? (
        <GradeSkeleton />
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-4">
          <p className="text-accent">{loadError}</p>
          <button
            type="button"
            onClick={() => setTentativa((n) => n + 1)}
            className="text-primary font-semibold text-sm hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          {temFiltro ? (
            <>
              <SearchX className="mx-auto w-10 h-10 text-gray-300" aria-hidden />
              <p className="text-gray-500 mt-4">
                {termoAplicado ? (
                  <>
                    Nenhum projeto encontrado para{" "}
                    <em className="font-semibold not-italic text-gray-700">
                      &ldquo;{termoAplicado}&rdquo;
                    </em>
                    .
                  </>
                ) : (
                  "Nenhum projeto nesta categoria."
                )}
              </p>
              <button
                type="button"
                onClick={limparFiltros}
                className="mt-4 text-primary font-semibold text-sm hover:underline"
              >
                Limpar filtros
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500">Nenhum projeto cadastrado ainda.</p>
              <button
                onClick={() => setFormOpen(true)}
                className="mt-4 text-primary font-semibold text-sm hover:underline"
              >
                Criar o primeiro projeto
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={project.project_id}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                      STATUS_STYLES[project.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {project.status}
                  </span>
                  {project.category && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      {project.category.description}
                    </span>
                  )}
                  {!project.visibility && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      Privado
                    </span>
                  )}
                </div>
                {me?.user_id === project.owner_id && (
                  <button
                    onClick={() => handleDelete(project.project_id)}
                    title="Excluir"
                    className="text-gray-300 hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>

              <h3 className="font-heading font-bold text-lg text-gray-900 leading-tight">
                {project.name}
              </h3>

              {project.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-50">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {project.likes_count}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {project.comments_count}
                </span>
                <Link
                  href={`/projeto/${project.project_id}`}
                  className="ml-auto text-sm font-semibold text-primary hover:underline"
                >
                  Ver mais →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
