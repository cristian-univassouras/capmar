"use client";
import { useState } from "react";
import { type Category, type Project, type ProjectPayload } from "@/lib/api";
import { ImagePicker } from "./media";

const inputClass = "w-full min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
export default function ProjectForm({ project, categories, onSave, onCancel }: {
  project?: Project; categories: Category[];
  onSave: (payload: ProjectPayload) => Promise<void>; onCancel: () => void;
}) {
  const [cover, setCover] = useState(project?.cover_url ?? null);
  const [logo, setLogo] = useState(project?.logo_url ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState(project?.keywords.map((tag) => tag.word).join(", ") ?? "");
  const busy = saving || coverBusy || logoBusy;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const keywords = tags.trim() ? tags.split(",").map((tag) => tag.trim()) : [];
    if (keywords.length > 8 || keywords.some((tag) => !tag || Array.from(tag.normalize("NFKC")).length > 20)) {
      setError("Use até 8 tags de 1 a 20 caracteres, separadas por vírgula.");
      return;
    }
    setSaving(true); setError("");
    try {
      await onSave({
        name: String(form.get("name")).trim(),
        description: String(form.get("description")).trim() || null,
        category_id: form.get("category_id") ? Number(form.get("category_id")) : null,
        status: String(form.get("status")), visibility: form.get("visibility") === "on",
        cover_url: cover, logo_url: logo, keywords,
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar o projeto."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6" aria-label={project ? "Editar projeto" : "Cadastrar projeto"}>
    <fieldset disabled={saving} className="space-y-5 min-w-0">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><p className="mb-2 font-semibold">Capa do projeto</p><ImagePicker label="Capa do projeto" value={cover} onChange={setCover} onBusyChange={setCoverBusy} /></div>
        <div><p className="mb-2 font-semibold">Logo do projeto</p><ImagePicker label="Logo do projeto" value={logo} onChange={setLogo} onBusyChange={setLogoBusy} variant="square" /></div>
      </div>
      <label className="block font-semibold">Nome do projeto<input className={inputClass} name="name" required maxLength={100} defaultValue={project?.name} /></label>
      <label className="block font-semibold">Descrição<textarea className={inputClass} name="description" rows={4} maxLength={10000} defaultValue={project?.description ?? ""} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-semibold">Categoria<select className={inputClass} name="category_id" defaultValue={project?.category_id ?? ""}><option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}</select></label>
        <label className="block font-semibold">Status<select className={inputClass} name="status" defaultValue={project?.status ?? "rascunho"}>{["rascunho", "ativo", "pausado", "concluido"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      </div>
      <label className="block font-semibold">Palavras-chave<input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Ex.: artesanato, Maricá, educação" aria-describedby="tags-help" maxLength={300} /></label>
      <p id="tags-help" className="text-sm text-gray-600">Separe por vírgula. Até 8 tags, com no máximo 20 caracteres cada. Deixe vazio para remover todas.</p>
      <label className="flex items-center gap-3"><input type="checkbox" name="visibility" className="h-5 w-5 accent-primary" defaultChecked={project?.visibility ?? true} />Projeto visível publicamente</label>
    </fieldset>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {(coverBusy || logoBusy) && <p role="status" className="text-sm text-gray-600">Aguarde o envio das imagens antes de salvar.</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Salvando..." : project ? "Salvar alterações" : "Criar projeto"}</button>
      <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-gray-300 px-6 py-3 disabled:opacity-50">Cancelar</button>
    </div>
  </form>;
}
