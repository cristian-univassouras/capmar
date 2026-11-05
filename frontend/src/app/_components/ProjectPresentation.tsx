"use client";
/* eslint-disable @next/next/no-img-element -- Mídias locais protegidas por cookie. */
import { useState } from "react";
import { mediaUrl, uploadImage, type PortfolioItem, type Partner, type Project } from "@/lib/api";

export const brandColors = { roxo: "#421C77", laranja: "#B84318", azul: "#100A55" };
const input = "mt-1 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-3 font-normal focus:outline-primary";
const action = "rounded-xl border border-primary/20 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-40";

export function PortfolioEditor({ items, onChange, onBusy }: { items: PortfolioItem[]; onChange: (items: PortfolioItem[]) => void; onBusy: (busy: boolean) => void }) {
  const [kind, setKind] = useState<PortfolioItem["kind"]>("image");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("O arquivo deve ter no máximo 5 MB."); return; }
    setBusy(true); onBusy(true); setError(""); setUrl("");
    try { setUrl(await uploadImage(file, kind === "pdf")); if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 100)); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha no envio."); }
    finally { setBusy(false); onBusy(false); }
  }
  function add() {
    if (!title.trim() || !url.trim()) { setError("Informe o título e envie o arquivo ou informe o link do vídeo."); return; }
    onChange([...items, { kind, title: title.trim(), description: description.trim(), url: url.trim() }]);
    setTitle(""); setDescription(""); setUrl(""); setError("");
  }
  function move(index: number, delta: number) {
    const updated = [...items]; [updated[index], updated[index + delta]] = [updated[index + delta], updated[index]]; onChange(updated);
  }
  return <section aria-label="Editar portfólio" className="space-y-4 rounded-2xl bg-primary/5 p-4">
    <div><h2 className="font-heading text-lg font-bold text-primary">Portfólio</h2><p className="text-sm text-gray-600">Até 12 materiais. Imagens e PDFs de até 5 MB (PDF: até 50 páginas). Vídeos por link do YouTube ou Vimeo.</p></div>
    <ol className="space-y-3">{items.map((item, index) => <li key={index} className="space-y-2 rounded-xl bg-white p-3">
      <p className="break-words font-semibold">{index + 1}. {item.title} <span className="text-xs font-normal uppercase">{item.kind}</span></p>
      <label className="block text-sm">Título do material {index + 1}<input className={input} value={item.title} maxLength={100} required onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, title: e.target.value } : p))} /></label>
      <label className="block text-sm">Descrição do material {index + 1}<textarea className={input} value={item.description} maxLength={500} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, description: e.target.value } : p))} /></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={index === 0 || busy} onClick={() => move(index, -1)} aria-label={"Mover material " + (index + 1) + " para cima"}>↑ Subir</button><button type="button" className={action} disabled={index === items.length - 1 || busy} onClick={() => move(index, 1)} aria-label={"Mover material " + (index + 1) + " para baixo"}>↓ Descer</button><button type="button" className={action} disabled={busy} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={"Remover material " + (index + 1)}>Remover</button></div>
    </li>)}</ol>
    {items.length < 12 && <div className="space-y-3">
      <label className="block font-semibold">Tipo de material<select className={input} value={kind} disabled={busy} onChange={(e) => { setKind(e.target.value as PortfolioItem["kind"]); setUrl(""); setError(""); }}><option value="image">Imagem</option><option value="pdf">PDF</option><option value="video">Vídeo</option></select></label>
      <input type="hidden" name="portfolio-draft-url" value={url} />
      <label className="block font-semibold">Título do novo material<input name="portfolio-draft-title" className={input} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block font-semibold">Descrição do novo material<textarea name="portfolio-draft-description" className={input} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      {kind === "video" ? <label className="block font-semibold">Link do vídeo<input type="url" className={input} placeholder="https://www.youtube.com/watch?v=..." value={url} maxLength={2048} onChange={(e) => setUrl(e.target.value)} /></label> : <label className="block text-sm font-semibold">Arquivo do portfólio<input key={kind + items.length} type="file" className={input} accept={kind === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif"} disabled={busy} onChange={async (e) => { const control = e.currentTarget; await upload(control.files?.[0]); control.value = ""; }} /></label>}
      {busy ? <p role="status">Enviando material...</p> : url && kind !== "video" && <p className="text-sm text-primary">Arquivo enviado. Adicione o material e salve o projeto para publicá-lo.</p>}
      <button type="button" disabled={busy} onClick={add} className={action}>Adicionar material</button>
      {(title || description || url) && <button type="button" disabled={busy} className={action + " ml-2"} onClick={() => { setTitle(""); setDescription(""); setUrl(""); setError(""); }}>Descartar rascunho</button>}
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

export function PartnersEditor({ items, onChange }: { items: Partner[]; onChange: (items: Partner[]) => void }) {
  return <section className="space-y-3 rounded-2xl bg-primary/5 p-4"><h2 className="font-heading text-lg font-bold text-primary">Parceiros institucionais</h2><p className="text-sm text-gray-600">Até 8 parceiros. Inclua somente vínculos autorizados pela instituição.</p>
    {items.map((item, index) => <div key={index} className="space-y-3 rounded-xl bg-white p-3">
      <label className="block font-semibold">Nome do parceiro {index + 1}<input className={input} value={item.name} required maxLength={100} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} /></label>
      <label className="block font-semibold">Descrição da parceria {index + 1}<textarea className={input} value={item.description} maxLength={300} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, description: e.target.value } : p))} /></label>
      <label className="block font-semibold">Site do parceiro {index + 1}<input className={input} type="url" pattern="https://.*" value={item.url ?? ""} placeholder="https://" maxLength={2048} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, url: e.target.value || null } : p))} /></label>
      <button type="button" className={action} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={"Remover parceiro " + (index + 1)}>Remover parceiro</button>
    </div>)}
    {items.length < 8 && <button className={action} type="button" onClick={() => onChange([...items, { name: "", description: "", url: null }])}>Adicionar parceiro</button>}
  </section>;
}

function Video({ item }: { item: PortfolioItem }) {
  const [playing, setPlaying] = useState(false);
  const video = new URL(item.url);
  const id = video.pathname.split("/").pop();
  const privacy = video.searchParams.get("h");
  const external = video.hostname === "www.youtube-nocookie.com" ? "https://www.youtube.com/watch?v=" + id : "https://vimeo.com/" + id + (privacy ? "/" + privacy : "");
  return <div className="space-y-2">{playing ? <iframe src={item.url} title={item.title} className="aspect-video w-full rounded-xl" allow="fullscreen; picture-in-picture; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen /> : <button type="button" onClick={() => setPlaying(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-secondary px-4 text-white"><span className="text-3xl" aria-hidden="true">▶</span><span>Reproduzir {item.title}</span><span className="text-xs text-white/80">Carregar vídeo externo · YouTube / Vimeo</span></button>}
    <a href={external} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm font-semibold text-primary underline">Abrir vídeo no provedor ↗</a>{playing && <p className="text-xs text-gray-600">Se o player não carregar, abra o vídeo diretamente no provedor.</p>}
  </div>;
}

export function ProjectMaterials({ project }: { project: Project }) {
  return <>
    {project.portfolio?.length > 0 && <section aria-label="Portfólio do projeto" className="space-y-4"><h2 className="font-heading text-xl font-bold">Portfólio</h2><div className={project.template === "minimalista" ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>{project.portfolio.map((item, index) => <article key={index + item.url} className="min-w-0 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      {item.kind === "image" ? <a href={mediaUrl(item.url)} target="_blank" rel="noopener noreferrer" aria-label={"Ampliar " + item.title}><img src={mediaUrl(item.url)} alt={item.title} loading="lazy" className="max-h-96 w-full rounded-xl object-contain" /></a> : item.kind === "video" ? <Video item={item} /> : <a href={mediaUrl(item.url)} className="flex min-h-24 items-center justify-center rounded-xl bg-primary/5 px-4 py-6 font-semibold text-primary" download>↓ Baixar PDF · {item.title}</a>}
      <h3 className="break-words font-bold">{item.title}</h3>{item.description && <p className="whitespace-pre-wrap break-words text-sm text-gray-600">{item.description}</p>}
    </article>)}</div></section>}
    {project.partners?.length > 0 && <section aria-label="Parcerias do projeto" className="space-y-4"><h2 className="font-heading text-xl font-bold">Parceiros institucionais</h2><div className="grid gap-4 sm:grid-cols-2">{project.partners.map((partner, index) => <article key={index} className="min-w-0 space-y-2 rounded-2xl border border-gray-200 bg-white p-4"><h3 className="break-words font-bold">{partner.name}</h3><p className="whitespace-pre-wrap break-words text-sm text-gray-600">{partner.description}</p>{partner.url && <a href={partner.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-block py-2 font-semibold text-primary underline">Visitar instituição ↗</a>}</article>)}</div></section>}
  </>;
}
