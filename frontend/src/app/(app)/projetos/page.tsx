"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProjetosPage() {
  const [me, setMe] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMe(getStoredUser());
    Promise.all([listProjects(), listCategories()])
      .then(([p, c]) => {
        setProjects(p);
        setCategories(c);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar.")
      )
      .finally(() => setLoading(false));
  }, []);

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
        <div>
          <h1 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">
            Projetos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre e gerencie os projetos da plataforma.
          </p>
        </div>
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

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-accent">
          {loadError}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Nenhum projeto cadastrado ainda.</p>
          <button
            onClick={() => setFormOpen(true)}
            className="mt-4 text-primary font-semibold text-sm hover:underline"
          >
            Criar o primeiro projeto
          </button>
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
