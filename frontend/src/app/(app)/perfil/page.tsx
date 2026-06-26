"use client";

import { useEffect, useState } from "react";

import {
  getStoredUser,
  getUser,
  listPosts,
  mediaUrl,
  saveUser,
  updateUser,
  type Post,
  type User,
} from "@/lib/api";
import { displayNameOf, formatDate, initialOf } from "@/lib/format";
import { ImagePicker } from "@/app/_components/media";

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      setLoading(false);
      return;
    }
    Promise.all([getUser(stored.user_id), listPosts(stored.user_id)])
      .then(([u, p]) => {
        setUser(u);
        setAvatarUrl(u.avatar_url);
        saveUser(u);
        setPosts(p);
      })
      .catch(() => setUser(stored))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateUser(user.user_id, {
        first_name: String(form.get("first_name")) || null,
        last_name: String(form.get("last_name")) || null,
        username: String(form.get("username")),
        email: String(form.get("email")),
        avatar_url: avatarUrl,
      });
      setUser(updated);
      saveUser(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Sessão não encontrada.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cartão do perfil */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-primary to-secondary" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-primary font-black text-2xl font-heading">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(user.avatar_url)} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                initialOf(user)
              )}
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setEditing(true);
                  setError(null);
                }}
                className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Editar perfil
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto de perfil</label>
                <ImagePicker value={avatarUrl} onChange={setAvatarUrl} variant="square" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome</label>
                  <input
                    name="first_name"
                    defaultValue={user.first_name ?? ""}
                    maxLength={20}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sobrenome</label>
                  <input
                    name="last_name"
                    defaultValue={user.last_name ?? ""}
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome de usuário</label>
                <input
                  name="username"
                  defaultValue={user.username}
                  minLength={3}
                  maxLength={20}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm font-semibold text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="font-heading font-black text-2xl text-foreground">{displayNameOf(user)}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                @{user.username} · {user.email}
              </p>

              <div className="flex gap-6 mt-5">
                <div className="text-center">
                  <p className="font-heading font-black text-xl text-foreground">{posts.length}</p>
                  <p className="text-xs text-gray-400">Publicações</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Publicações do usuário */}
      <div className="space-y-3">
        <h2 className="font-heading font-bold text-lg text-foreground">Minhas publicações</h2>
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
            Você ainda não publicou nada.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.post_id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
              <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.project && (
                <p className="text-xs font-semibold text-primary">↳ {post.project.name}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
