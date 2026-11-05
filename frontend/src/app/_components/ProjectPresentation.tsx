"use client";
/* eslint-disable @next/next/no-img-element -- Mídias locais protegidas por cookie. */
import { useState } from "react";
import { FileDown, Play } from "lucide-react";
import { mediaUrl, uploadImage, type PortfolioItem, type Partner, type Project } from "@/lib/api";

/** Cores de destaque do projeto. As chaves ("roxo", "laranja", "azul") são gravadas no backend; os tons seguem a identidade. */
export const brandColors = { roxo: "#1b4fa8", laranja: "#a43a1e", azul: "#0e2f3c" };
export const brandLabels = { roxo: "Cobalto", laranja: "Terracota", azul: "Azul-petróleo" };
const input = "ui-input";
const action = "ui-button";

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
  return <section aria-label="Editar portfólio" className="ui-panel grid gap-4 p-4 sm:p-5">
    <div><h2 className="font-heading text-lg font-bold text-secondary">Portfólio</h2><p className="text-[14px] text-muted">Até 12 materiais. Imagens e PDFs de até 5 MB (PDF: até 50 páginas). Vídeos por link do YouTube ou Vimeo.</p></div>
    <ol className="grid gap-3">{items.map((item, index) => <li key={index} className="grid gap-3 rounded-xl border border-line bg-surface-2 p-3">
      <p className="break-words font-semibold">{index + 1}. {item.title} <span className="ui-badge ml-1">{item.kind === "image" ? "Imagem" : item.kind === "pdf" ? "PDF" : "Vídeo"}</span></p>
      <label className="ui-field">Título do material {index + 1}<input className={input} value={item.title} maxLength={100} required onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, title: e.target.value } : p))} /></label>
      <label className="ui-field">Descrição do material {index + 1}<textarea className={input} value={item.description} maxLength={500} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, description: e.target.value } : p))} /></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={index === 0 || busy} onClick={() => move(index, -1)} aria-label={"Mover material " + (index + 1) + " para cima"}>↑ Subir</button><button type="button" className={action} disabled={index === items.length - 1 || busy} onClick={() => move(index, 1)} aria-label={"Mover material " + (index + 1) + " para baixo"}>↓ Descer</button><button type="button" className={action} disabled={busy} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={"Remover material " + (index + 1)}>Remover</button></div>
    </li>)}</ol>
    {items.length < 12 && <div className="grid gap-3">
      <label className="ui-field">Tipo de material<select className={input} value={kind} disabled={busy} onChange={(e) => { setKind(e.target.value as PortfolioItem["kind"]); setUrl(""); setError(""); }}><option value="image">Imagem</option><option value="pdf">PDF</option><option value="video">Vídeo</option></select></label>
      <input type="hidden" name="portfolio-draft-url" value={url} />
      <label className="ui-field">Título do novo material<input name="portfolio-draft-title" className={input} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="ui-field">Descrição do novo material<textarea name="portfolio-draft-description" className={input} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      {kind === "video" ? <label className="ui-field">Link do vídeo<input type="url" className={input} placeholder="https://www.youtube.com/watch?v=..." value={url} maxLength={2048} onChange={(e) => setUrl(e.target.value)} /></label> : <label className="ui-field">Arquivo do portfólio<input key={kind + items.length} type="file" className={input} accept={kind === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif"} disabled={busy} onChange={async (e) => { const control = e.currentTarget; await upload(control.files?.[0]); control.value = ""; }} /></label>}
      {busy ? <p role="status" className="text-[14px] text-muted">Enviando material...</p> : url && kind !== "video" && <p className="text-[14px] font-semibold text-primary">Arquivo enviado. Adicione o material e salve o projeto para publicá-lo.</p>}
      <button type="button" disabled={busy} onClick={add} className={action}>Adicionar material</button>
      {(title || description || url) && <button type="button" disabled={busy} className={action} onClick={() => { setTitle(""); setDescription(""); setUrl(""); setError(""); }}>Descartar rascunho</button>}
    </div>}
    {error && <p role="alert" className="ui-error">{error}</p>}
  </section>;
}

export function PartnersEditor({ items, onChange }: { items: Partner[]; onChange: (items: Partner[]) => void }) {
  return <section className="ui-panel grid gap-4 p-4 sm:p-5"><h2 className="font-heading text-lg font-bold text-secondary">Parceiros institucionais</h2><p className="text-[14px] text-muted">Até 8 parceiros. Inclua somente vínculos autorizados pela instituição.</p>
    {items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-line bg-surface-2 p-3">
      <label className="ui-field">Nome do parceiro {index + 1}<input className={input} value={item.name} required maxLength={100} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} /></label>
      <label className="ui-field">Descrição da parceria {index + 1}<textarea className={input} value={item.description} maxLength={300} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, description: e.target.value } : p))} /></label>
      <label className="ui-field">Site do parceiro {index + 1}<input className={input} type="url" pattern="https://.*" value={item.url ?? ""} placeholder="https://" maxLength={2048} onChange={(e) => onChange(items.map((p, i) => i === index ? { ...p, url: e.target.value || null } : p))} /></label>
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
  return <div className="space-y-2">{playing ? <iframe src={item.url} title={item.title} className="aspect-video w-full rounded-xl" allow="fullscreen; picture-in-picture; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen /> : <button type="button" onClick={() => setPlaying(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-secondary px-4 text-center text-white"><Play size={32} aria-hidden="true" /><span>Reproduzir {item.title}</span><span className="text-[13px] text-white/85">Carregar vídeo externo · YouTube / Vimeo</span></button>}
    <a href={external} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-primary underline">Abrir vídeo no provedor ↗</a>{playing && <p className="text-[13px] text-muted">Se o player não carregar, abra o vídeo diretamente no provedor.</p>}
  </div>;
}

export function ProjectMaterials({ project }: { project: Project }) {
  return <div className="grid gap-8">
    {project.portfolio?.length > 0 && <section aria-label="Portfólio do projeto" className="grid gap-4"><h2 className="font-heading text-xl font-bold text-secondary">Portfólio</h2><div className={project.template === "minimalista" ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>{project.portfolio.map((item, index) => <article key={index + item.url} className="ui-panel grid min-w-0 gap-3 p-4">
      {item.kind === "image" ? <a href={mediaUrl(item.url)} target="_blank" rel="noopener noreferrer" aria-label={"Ampliar " + item.title}><img src={mediaUrl(item.url)} alt={item.title} loading="lazy" className="max-h-96 w-full rounded-xl object-contain" /></a> : item.kind === "video" ? <Video item={item} /> : <a href={mediaUrl(item.url)} className="flex min-h-24 items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 py-6 font-semibold text-primary" download><FileDown size={20} aria-hidden="true" />Baixar PDF · {item.title}</a>}
      <h3 className="break-words font-heading text-lg font-bold text-secondary">{item.title}</h3>{item.description && <p className="whitespace-pre-wrap break-words text-[14px] text-muted">{item.description}</p>}
    </article>)}</div></section>}
    {project.partners?.length > 0 && <section aria-label="Parcerias do projeto" className="grid gap-4"><h2 className="font-heading text-xl font-bold text-secondary">Parceiros institucionais</h2><div className="grid gap-4 sm:grid-cols-2">{project.partners.map((partner, index) => <article key={index} className="ui-panel grid min-w-0 gap-2 p-4"><h3 className="break-words font-heading text-lg font-bold text-secondary">{partner.name}</h3><p className="whitespace-pre-wrap break-words text-[14px] text-muted">{partner.description}</p>{partner.url && <a href={partner.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Visitar instituição ↗</a>}</article>)}</div></section>}
  </div>;
}
