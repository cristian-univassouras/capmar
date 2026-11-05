"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Category, type Project, type ProjectPayload } from "@/lib/api";
import { STATUS_OPTIONS } from "@/lib/format";
import { ImagePicker } from "./media";
import { PortfolioEditor, PartnersEditor, brandColors, brandLabels } from "./ProjectPresentation";
import { useConfirm, useToast } from "./ui/feedback";

type Accent = keyof typeof brandColors;
type Fields = {
  name: string; description: string; category_id: string; status: string; authorship: string;
  responsible_names: string; funding_url: string; funding_description: string;
};
type Draft = {
  savedAt: number; fields: Partial<Fields>; visible: boolean; tags: string; template: string; accent: Accent;
  cover: string | null; logo: string | null; portfolio: Project["portfolio"]; partners: Project["partners"];
};
type FieldErrors = Partial<Record<"name" | "tags" | "funding_url", string>>;

const FIELD_NAMES: (keyof Fields)[] = ["name", "description", "category_id", "status", "authorship", "responsible_names", "funding_url", "funding_description"];
const draftKey = (project?: Project) => "capmar:rascunho-projeto:" + (project ? project.project_id : "novo");

function readDraft(key: string): Draft | null {
  if (typeof window === "undefined") return null;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}
function clearDraft(key: string) { try { window.localStorage.removeItem(key); } catch { /* armazenamento indisponível */ } }

/** Formulário de projeto. O rascunho é guardado neste aparelho (localStorage) até salvar ou cancelar. */
export default function ProjectForm(props: {
  project?: Project; categories: Category[];
  onSave: (payload: ProjectPayload) => Promise<void>; onCancel: () => void;
}) {
  const [version, setVersion] = useState(0);
  return <ProjectFormInner key={version} {...props} ignoreDraft={version > 0} onDiscardDraft={() => { clearDraft(draftKey(props.project)); setVersion((v) => v + 1); }} />;
}

function ProjectFormInner({ project, categories, onSave, onCancel, ignoreDraft, onDiscardDraft }: {
  project?: Project; categories: Category[];
  onSave: (payload: ProjectPayload) => Promise<void>; onCancel: () => void;
  ignoreDraft: boolean; onDiscardDraft: () => void;
}) {
  const key = draftKey(project);
  const [draft] = useState<Draft | null>(() => (ignoreDraft ? null : readDraft(key)));
  const d = draft?.fields ?? {};
  const confirm = useConfirm();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<string | null>(draft ? draft.cover : project?.cover_url ?? null);
  const [logo, setLogo] = useState<string | null>(draft ? draft.logo : project?.logo_url ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [portfolio, setPortfolio] = useState(draft?.portfolio ?? project?.portfolio ?? []);
  const [partners, setPartners] = useState(draft?.partners ?? project?.partners ?? []);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [template, setTemplate] = useState(draft?.template ?? project?.template ?? "classico");
  const [accent, setAccent] = useState<Accent>(draft?.accent ?? project?.accent ?? "roxo");
  const [tags, setTags] = useState(draft?.tags ?? project?.keywords.map((tag) => tag.word).join(", ") ?? "");
  const [visible, setVisible] = useState(draft?.visible ?? project?.visibility ?? false);
  const [dirty, setDirty] = useState(Boolean(draft));
  const [tick, setTick] = useState(0);
  const [stored, setStored] = useState(Boolean(draft));
  const busy = saving || coverBusy || logoBusy || portfolioBusy;

  const touch = useCallback(() => { setDirty(true); setTick((n) => n + 1); }, []);
  const latest = useRef({ cover, logo, portfolio, partners, template, accent, tags, visible });
  useEffect(() => { latest.current = { cover, logo, portfolio, partners, template, accent, tags, visible }; });

  useEffect(() => { nameRef.current?.focus(); }, []);

  // Guarda o rascunho local pouco depois da última alteração.
  useEffect(() => {
    if (!dirty || tick === 0) return;
    const timer = window.setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const data = new FormData(form);
      const fields: Partial<Fields> = {};
      for (const name of FIELD_NAMES) fields[name] = String(data.get(name) ?? "");
      const snapshot: Draft = { savedAt: Date.now(), fields, ...latest.current };
      try { window.localStorage.setItem(key, JSON.stringify(snapshot)); setStored(true); } catch { /* armazenamento cheio ou indisponível */ }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, tick, key, cover, logo, portfolio, partners, template, accent, tags, visible]);

  async function cancel() {
    if (dirty) {
      const ok = await confirm({ title: "Descartar as alterações?", message: "O que você preencheu e não salvou será apagado deste aparelho.", confirmLabel: "Descartar", cancelLabel: "Continuar editando", danger: true });
      if (!ok) return;
    }
    clearDraft(key);
    onCancel();
  }

  function fail(message: string, errors: FieldErrors = {}) {
    setError(message); setFieldErrors(errors); setShake((n) => n + 1);
    const first = (Object.keys(errors)[0] ?? "") as keyof FieldErrors;
    const target = first === "name" ? "projeto-nome" : first === "tags" ? "projeto-tags" : first === "funding_url" ? "projeto-apoio-url" : "";
    if (target) document.getElementById(target)?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (["portfolio-draft-title", "portfolio-draft-description", "portfolio-draft-url"].some((name) => String(form.get(name) ?? "").trim())) {
      fail("Há um material em rascunho. Clique em Adicionar material ou Descartar rascunho antes de salvar."); return;
    }
    const errors: FieldErrors = {};
    const name = String(form.get("name")).trim();
    if (!name) errors.name = "Dê um nome ao projeto.";
    const keywords = tags.trim() ? tags.split(",").map((tag) => tag.trim()) : [];
    if (keywords.length > 8 || keywords.some((tag) => !tag || Array.from(tag.normalize("NFKC")).length > 20)) {
      errors.tags = "Use até 8 tags de 1 a 20 caracteres, separadas por vírgula.";
    }
    const funding = String(form.get("funding_url")).trim();
    if (funding && !/^https:\/\/\S+$/.test(funding)) errors.funding_url = "Use um endereço completo que comece com https://";
    if (Object.keys(errors).length) { fail("Confira os campos destacados.", errors); return; }
    setSaving(true); setError(""); setFieldErrors({});
    try {
      await onSave({
        name,
        description: String(form.get("description")).trim() || null,
        category_id: form.get("category_id") ? Number(form.get("category_id")) : null,
        status: String(form.get("status")), visibility: visible,
        cover_url: cover, logo_url: logo, keywords,
        template: template as "classico" | "criativo" | "minimalista", accent, portfolio, partners,
        authorship: String(form.get("authorship")) as "individual" | "group",
        responsible_names: String(form.get("responsible_names")).trim() || null,
        funding_url: funding || null,
        funding_description: String(form.get("funding_description")).trim() || null,
      });
      clearDraft(key);
      toast(project ? "Alterações salvas" : "Projeto criado", "success");
    } catch (err) { fail(err instanceof Error ? err.message : "Não foi possível salvar o projeto."); }
    finally { setSaving(false); }
  }

  const sections = [["informacoes", "Informações"], ["materiais", "Imagens e materiais"], ["aparencia", "Aparência"], ["parcerias", "Parcerias e apoio"], ["visibilidade", "Revisar e salvar"]];
  const mark = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); touch(); };
  return <form ref={formRef} onSubmit={submit} onChange={touch} noValidate className="project-editor ui-panel" aria-label={project ? "Editar projeto" : "Cadastrar projeto"}>
    <div className="project-editor-heading">
      <h2 className="font-heading text-2xl font-bold text-secondary">{project ? "Editar projeto" : "Vamos apresentar sua ideia?"}</h2>
      <p className="mt-2 max-w-[62ch] text-[15px] text-muted">Comece pelo essencial. Imagens, materiais e parceiros podem ser acrescentados depois.</p>
      {draft && <p role="status" className="ui-notice mt-4 flex flex-wrap items-center justify-between gap-3">
        <span>Restauramos o rascunho guardado neste aparelho em {new Date(draft.savedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.</span>
        <button type="button" onClick={onDiscardDraft} className="ui-button">Começar do zero</button>
      </p>}
    </div>
    <div className="project-editor-grid"><nav aria-label="Seções do formulário" className="project-editor-nav">{sections.map(([id, label]) => <a href={"#projeto-" + id} key={id}>{label}</a>)}</nav>
    <fieldset disabled={saving} className="grid min-w-0 gap-8">
      <section id="projeto-informacoes" className="project-editor-section"><div className="section-heading"><div><h3>Informações do projeto</h3><p>O que você está construindo e quem faz parte.</p></div></div>
        <label className={"ui-field" + (fieldErrors.name ? " has-error" : "")}>Nome do projeto<input ref={nameRef} id="projeto-nome" name="name" required maxLength={100} defaultValue={d.name ?? project?.name} placeholder="Dê um nome à sua iniciativa" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "erro-nome" : undefined} />{fieldErrors.name && <span id="erro-nome" className="error">{fieldErrors.name}</span>}</label>
        <label className="ui-field">Descrição<textarea name="description" rows={4} maxLength={10000} defaultValue={d.description ?? project?.description ?? ""} placeholder="Conte o propósito do projeto e o que você quer realizar." /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ui-field">Categoria<select name="category_id" defaultValue={d.category_id ?? project?.category_id ?? ""}><option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}</select></label>
          <label className="ui-field">Status<select name="status" defaultValue={d.status ?? project?.status ?? "rascunho"}>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        </div>
        <div className={"ui-field" + (fieldErrors.tags ? " has-error" : "")}><label htmlFor="projeto-tags">Palavras-chave</label><input id="projeto-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Ex.: artesanato, Maricá, educação" aria-invalid={Boolean(fieldErrors.tags)} aria-describedby={fieldErrors.tags ? "erro-tags" : "tags-help"} maxLength={300} />{fieldErrors.tags ? <span id="erro-tags" className="error">{fieldErrors.tags}</span> : <span id="tags-help" className="hint">Separe por vírgula. Até 8 tags, com no máximo 20 caracteres cada.</span>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ui-field">Autoria<select name="authorship" defaultValue={d.authorship ?? project?.authorship ?? "individual"}><option value="individual">Individual</option><option value="group">Em grupo</option></select></label>
          <label className="ui-field">Responsáveis<input name="responsible_names" defaultValue={d.responsible_names ?? project?.responsible_names ?? ""} maxLength={500} placeholder="Informe os responsáveis quando o projeto for em grupo" /></label>
        </div>
      </section>
      <section id="projeto-materiais" className="project-editor-section"><div className="section-heading"><div><h3>Mostre o seu projeto</h3><p>Adicione imagens e materiais que ajudem a contar essa história.</p></div></div>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_150px]"><div><p className="mb-2 font-semibold text-secondary">Capa do projeto</p><ImagePicker label="Capa do projeto" value={cover} onChange={mark(setCover)} onBusyChange={setCoverBusy} /></div><div><p className="mb-2 font-semibold text-secondary">Logo do projeto</p><ImagePicker label="Logo do projeto" value={logo} onChange={mark(setLogo)} onBusyChange={setLogoBusy} variant="square" /></div></div>
        <PortfolioEditor items={portfolio} onChange={mark(setPortfolio)} onBusy={setPortfolioBusy} />
      </section>
      <section id="projeto-aparencia" className="project-editor-section"><div className="section-heading"><div><h3>Aparência do projeto</h3><p>Escolha a apresentação que combina com sua iniciativa.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ui-field">Estilo de apresentação<select value={template} onChange={(e) => { setTemplate(e.target.value); touch(); }}><option value="classico">Clássico</option><option value="criativo">Criativo</option><option value="minimalista">Minimalista</option></select></label>
          <label className="ui-field">Cor de destaque<select value={accent} onChange={(e) => { setAccent(e.target.value as Accent); touch(); }}>{(Object.keys(brandColors) as Accent[]).map((c) => <option key={c} value={c}>{brandLabels[c]}</option>)}</select></label>
        </div>
        <div aria-label="Prévia de aparência" className="rounded-xl border border-line bg-surface p-5" style={{ borderTop: (template === "minimalista" ? 2 : 6) + "px solid " + brandColors[accent], textAlign: template === "criativo" ? "center" : undefined }}><p className="font-heading text-xl font-bold" style={{ color: brandColors[accent] }}>Seu projeto no CapMar</p><p className="mt-2 text-[15px] text-muted">{template === "minimalista" ? "Apresentação simples, com materiais em lista." : template === "criativo" ? "Capa em destaque e materiais em grade." : "Apresentação clássica e materiais em grade."}</p></div>
      </section>
      <section id="projeto-parcerias" className="project-editor-section"><div className="section-heading"><div><h3>Construído em conjunto</h3><p>Parcerias e apoio são opcionais.</p></div></div>
        <PartnersEditor items={partners} onChange={mark(setPartners)} />
        <label className={"ui-field" + (fieldErrors.funding_url ? " has-error" : "")}>Link de apoio financeiro<input id="projeto-apoio-url" name="funding_url" type="url" defaultValue={d.funding_url ?? project?.funding_url ?? ""} maxLength={2048} placeholder="https://" aria-invalid={Boolean(fieldErrors.funding_url)} aria-describedby={fieldErrors.funding_url ? "erro-apoio" : undefined} />{fieldErrors.funding_url && <span id="erro-apoio" className="error">{fieldErrors.funding_url}</span>}</label>
        <label className="ui-field">Descrição do apoio<input name="funding_description" defaultValue={d.funding_description ?? project?.funding_description ?? ""} maxLength={300} placeholder="Como o apoio será utilizado" /></label>
      </section>
      <section id="projeto-visibilidade" className="project-editor-section"><div className="section-heading"><div><h3>Quem pode ver?</h3><p>Você pode alterar a visibilidade a qualquer momento.</p></div></div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl bg-primary-soft p-4 font-semibold text-secondary"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-5 w-5 shrink-0 accent-primary" />Projeto visível publicamente</label>
        <p className="text-[14px] text-muted">{visible ? "Qualquer pessoa pode encontrar, abrir e compartilhar este projeto." : "Só você e as pessoas autorizadas veem este projeto. Marque a opção quando quiser divulgá-lo."}</p>
      </section>
    </fieldset></div>
    <div className="project-editor-actions">
      {error && <p role="alert" key={shake} className="ui-error shake w-full">{error}</p>}
      {(coverBusy || logoBusy || portfolioBusy) && <p role="status" className="w-full text-[14px] text-muted">Aguarde o envio dos materiais antes de salvar.</p>}
      {stored && dirty && <p role="status" className="mr-auto self-center text-[13px] text-muted">Rascunho guardado neste aparelho.</p>}
      <button type="button" disabled={busy} onClick={cancel} className="ui-button">Cancelar</button>
      <button disabled={busy} className={"ui-button ui-button-primary" + (saving ? " is-loading" : "")}>{saving ? "Salvando..." : project ? "Salvar alterações" : "Criar projeto"}</button>
    </div>
  </form>;
}

/** Abre um painel com uma revelação curta (clip-path + opacidade); sem movimento se o usuário pediu menos. */
export function OpenPanel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = el.animate(
      [{ clipPath: "inset(0 0 100% 0 round 16px)", opacity: 0 }, { clipPath: "inset(0 0 0% 0 round 16px)", opacity: 1 }],
      { duration: 360, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    return () => animation.cancel();
  }, []);
  return <div ref={ref}>{children}</div>;
}
