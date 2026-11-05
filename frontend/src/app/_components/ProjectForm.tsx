"use client";
import { useState } from "react";
import { type Category, type Project, type ProjectPayload } from "@/lib/api";
import { ImagePicker } from "./media";
import { PortfolioEditor, PartnersEditor, brandColors } from "./ProjectPresentation";

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
  const [portfolio, setPortfolio] = useState(project?.portfolio ?? []);
  const [partners, setPartners] = useState(project?.partners ?? []);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [template, setTemplate] = useState(project?.template ?? "classico");
  const [accent, setAccent] = useState<keyof typeof brandColors>(project?.accent ?? "roxo");
  const [tags, setTags] = useState(project?.keywords.map((tag) => tag.word).join(", ") ?? "");
  const busy = saving || coverBusy || logoBusy || portfolioBusy;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (["portfolio-draft-title", "portfolio-draft-description", "portfolio-draft-url"].some((key) => String(form.get(key) ?? "").trim())) {
      setError("Há um material em rascunho. Clique em Adicionar material ou Descartar rascunho antes de salvar."); return;
    }
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
        template: template as "classico" | "criativo" | "minimalista", accent, portfolio, partners,
        authorship: String(form.get("authorship")) as "individual" | "group",
        responsible_names: String(form.get("responsible_names")).trim() || null,
        funding_url: String(form.get("funding_url")).trim() || null,
        funding_description: String(form.get("funding_description")).trim() || null,
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar o projeto."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="project-editor ui-panel" aria-label={project ? "Editar projeto" : "Cadastrar projeto"}>
    <div className="project-editor-heading"><p className="ui-eyebrow">Seu espaço na comunidade</p><h2 className="mt-2 font-heading text-2xl font-bold text-secondary">{project ? "Editar projeto" : "Vamos apresentar sua ideia?"}</h2><p className="mt-2 text-sm text-gray-500">Comece pelo essencial. Imagens, materiais e parceiros podem ser acrescentados depois.</p></div>
    <div className="project-editor-grid"><nav aria-label="Seções do formulário" className="project-editor-nav">{[["informacoes","01","Informações"],["materiais","02","Imagens e materiais"],["aparencia","03","Aparência"],["parcerias","04","Parcerias e apoio"],["visibilidade","05","Revisar e salvar"]].map(([id,n,label])=><a href={"#projeto-"+id} key={id}><span>{n}</span>{label}</a>)}</nav>
    <fieldset disabled={saving} className="min-w-0 space-y-8">
      <section id="projeto-informacoes" className="project-editor-section"><div className="section-heading"><span>01</span><div><h3>Informações do projeto</h3><p>O que você está construindo e quem faz parte.</p></div></div>
        <label className="block font-semibold">Nome do projeto<input className={inputClass} name="name" required maxLength={100} defaultValue={project?.name} placeholder="Dê um nome à sua iniciativa"/></label>
        <label className="block font-semibold">Descrição<textarea className={inputClass} name="description" rows={4} maxLength={10000} defaultValue={project?.description ?? ""} placeholder="Conte o propósito do projeto e o que você quer realizar."/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block font-semibold">Categoria<select className={inputClass} name="category_id" defaultValue={project?.category_id ?? ""}><option value="">Sem categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.description}</option>)}</select></label><label className="block font-semibold">Status<select className={inputClass} name="status" defaultValue={project?.status ?? "rascunho"}>{["rascunho","ativo","pausado","concluido"].map(status=><option key={status} value={status}>{status}</option>)}</select></label></div>
        <label className="block font-semibold">Palavras-chave<input className={inputClass} value={tags} onChange={e=>setTags(e.target.value)} placeholder="Ex.: artesanato, Maricá, educação" aria-describedby="tags-help" maxLength={300}/></label><p id="tags-help" className="text-xs text-gray-500">Separe por vírgula. Até 8 tags, com no máximo 20 caracteres cada.</p>
        <label className="block font-semibold">Autoria<select name="authorship" defaultValue={project?.authorship ?? "individual"} className={inputClass}><option value="individual">Individual</option><option value="group">Em grupo</option></select></label><label className="block font-semibold">Responsáveis<input name="responsible_names" defaultValue={project?.responsible_names ?? ""} maxLength={500} className={inputClass} placeholder="Informe os responsáveis quando o projeto for em grupo"/></label>
      </section>
      <section id="projeto-materiais" className="project-editor-section"><div className="section-heading"><span>02</span><div><h3>Mostre o seu projeto</h3><p>Adicione imagens e materiais que ajudem a contar essa história.</p></div></div><div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_150px]"><div><p className="mb-2 font-semibold">Capa do projeto</p><ImagePicker label="Capa do projeto" value={cover} onChange={setCover} onBusyChange={setCoverBusy}/></div><div><p className="mb-2 font-semibold">Logo do projeto</p><ImagePicker label="Logo do projeto" value={logo} onChange={setLogo} onBusyChange={setLogoBusy} variant="square"/></div></div><PortfolioEditor items={portfolio} onChange={setPortfolio} onBusy={setPortfolioBusy}/></section>
      <section id="projeto-aparencia" className="project-editor-section"><div className="section-heading"><span>03</span><div><h3>Aparência do projeto</h3><p>Escolha a apresentação que combina com sua iniciativa.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="block font-semibold">Estilo de apresentação<select className={inputClass} value={template} onChange={e=>setTemplate(e.target.value)}><option value="classico">Clássico</option><option value="criativo">Criativo</option><option value="minimalista">Minimalista</option></select></label><label className="block font-semibold">Cor de destaque<select className={inputClass} value={accent} onChange={e=>setAccent(e.target.value as keyof typeof brandColors)}><option value="roxo">Roxo CapMar</option><option value="laranja">Laranja CapMar</option><option value="azul">Azul CapMar</option></select></label></div><div aria-label="Prévia de aparência" className={"rounded-xl border bg-white p-5 "+(template==="criativo"?"text-center":"")} style={{borderColor:brandColors[accent],borderTopWidth:template==="minimalista"?2:6}}><p className="font-heading text-xl font-bold" style={{color:brandColors[accent]}}>Seu projeto no CapMar</p><p className="mt-2 text-sm text-gray-500">{template==="minimalista"?"Apresentação simples, com materiais em lista.":template==="criativo"?"Capa em destaque, título centralizado e materiais em grade.":"Apresentação clássica e materiais em grade."}</p></div></section>
      <section id="projeto-parcerias" className="project-editor-section"><div className="section-heading"><span>04</span><div><h3>Construído em conjunto</h3><p>Parcerias e apoio são opcionais.</p></div></div><PartnersEditor items={partners} onChange={setPartners}/><label className="block font-semibold">Link de apoio financeiro<input name="funding_url" type="url" defaultValue={project?.funding_url ?? ""} maxLength={2048} pattern="https://.*" placeholder="https://" className={inputClass}/></label><label className="block font-semibold">Descrição do apoio<input name="funding_description" defaultValue={project?.funding_description ?? ""} maxLength={300} className={inputClass} placeholder="Como o apoio será utilizado"/></label></section>
      <section id="projeto-visibilidade" className="project-editor-section"><div className="section-heading"><span>05</span><div><h3>Quem pode ver?</h3><p>Você pode alterar a visibilidade a qualquer momento.</p></div></div><label className="flex items-center gap-3 rounded-xl bg-primary/5 p-4"><input type="checkbox" name="visibility" className="h-5 w-5 shrink-0 accent-primary" defaultChecked={project?.visibility ?? true}/>Projeto visível publicamente</label><p className="text-xs leading-relaxed text-gray-500">Projetos públicos podem ser explorados e compartilhados. Projetos privados ficam disponíveis apenas para pessoas autorizadas.</p></section>
    </fieldset></div>
    <div className="project-editor-actions">{error&&<p role="alert" className="w-full rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{(coverBusy||logoBusy||portfolioBusy)&&<p role="status" className="w-full text-sm text-gray-500">Aguarde o envio dos materiais antes de salvar.</p>}<button type="button" disabled={busy} onClick={onCancel} className="ui-button">Cancelar</button><button disabled={busy} className="ui-button ui-button-primary">{saving?"Salvando...":project?"Salvar alterações":"Criar projeto"}</button></div>
  </form>;
}
