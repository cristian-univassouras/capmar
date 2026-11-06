"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Heart, QrCode } from "lucide-react";

import { downloadDiscoverCsv, getDiscoverMetrics, type DiscoverMetrics, type ExportKind } from "@/lib/discover-admin";
import { useToast } from "@/app/_components/ui/feedback";
import { EmptyState, ListSkeleton } from "@/app/_components/ui/primitives";

function sinceFor(period: string) {
  const hours = PERIODS.find((p) => p.id === period)?.hours ?? 0;
  return hours ? new Date(Date.now() - hours * 3600_000).toISOString() : null;
}
const pct = (n: number | null | undefined) => (n == null ? "–" : `${Math.round(n * 100)}%`);
const num = (n: number | null | undefined, digits = 1) => (n == null ? "–" : n.toLocaleString("pt-BR", { maximumFractionDigits: digits }));
const secs = (s: number | null | undefined) => (s == null ? "–" : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);
const hm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const METHODS: Record<string, string> = { swipe: "Arrastar", button: "Botão", keyboard: "Teclado", details: "Dentro dos detalhes", tap: "Toque", "?": "Não informado" };
const PERIODS = [{ id: "all", label: "Tudo", hours: 0 }, { id: "1", label: "Última hora", hours: 1 }, { id: "3", label: "Últimas 3 horas", hours: 3 }, { id: "24", label: "Últimas 24 horas", hours: 24 }];

function Stat({ label, value, hint, tone = "primary" }: { label: string; value: string; hint?: string; tone?: "primary" | "teal" | "accent" | "sun" }) {
  const bg = { primary: "bg-primary-soft", teal: "bg-teal-soft", accent: "bg-accent-soft", sun: "bg-sun-soft" }[tone];
  return <div className={`rounded-[14px] px-4 py-3 ${bg}`}><dt className="text-[13px] font-semibold text-muted">{label}</dt><dd className="font-heading text-3xl font-extrabold text-secondary">{value}</dd>{hint && <p className="text-[12px] text-muted">{hint}</p>}</div>;
}

function Bar({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  return (
    <li className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 text-[14px]"><span className="text-secondary">{label}</span><span className="font-semibold text-secondary">{value}{note && <span className="ml-1 font-normal text-muted">{note}</span>}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
    </li>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={"ui-panel p-5 " + className}><h3 className="mb-3 font-heading text-lg font-extrabold text-secondary">{title}</h3>{children}</section>;
}

function EventQr() {
  const [base, setBase] = useState(() => window.location.origin);
  const [source, setSource] = useState("evento");
  const [qr, setQr] = useState("");
  const clean = source.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40);
  const link = `${base.replace(/\/+$/, "")}/descobrir${clean ? `?e=${clean}` : ""}`;
  const local = /^https?:\/\/(localhost|127\.|\[::1\])/.test(base);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(link, { width: 768, margin: 4, errorCorrectionLevel: "M", color: { dark: "#0e2f3c", light: "#FFFFFF" } }).then((url) => { if (active) setQr(url); }).catch(() => { if (active) setQr(""); });
    return () => { active = false; };
  }, [link]);
  return (
    <Section title="QR Code do evento">
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <div className="grid place-items-center rounded-[16px] border border-line bg-white p-2">
          {qr ? <img src={qr} alt={`QR Code para ${link}`} className="h-44 w-44" /> : <QrCode size={64} aria-hidden="true" className="text-muted" />}
        </div>
        <div className="grid content-start gap-3">
          <label className="ui-field">Endereço do site<input value={base} onChange={(e) => setBase(e.target.value)} inputMode="url" /></label>
          <label className="ui-field">Nome desta origem (identifica de onde vieram as pessoas)<input value={source} onChange={(e) => setSource(e.target.value)} maxLength={40} /></label>
          {local && <p role="alert" className="ui-error">Esse endereço só abre neste computador. Para o celular escanear, use o endereço público do site ou o IP da sua rede (por exemplo http://192.168.0.10:3001).</p>}
          <p className="break-all rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-secondary">{link}</p>
          <div className="flex flex-wrap gap-2">
            <a href={qr} download={`qr-descobrir-${clean || "evento"}.png`} aria-disabled={!qr} className="ui-button ui-button-primary"><Download size={16} aria-hidden="true" />Baixar QR (PNG)</a>
            <button type="button" className="ui-button" onClick={() => void navigator.clipboard?.writeText(link)}>Copiar link</button>
            <a href={link} target="_blank" rel="noopener" className="ui-button">Abrir o baralho</a>
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function DiscoverPanel({ refresh }: { refresh: number }) {
  const toast = useToast();
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState("");
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<DiscoverMetrics | null>(null);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState("");
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const key = [period, source, refresh, tick].join(":");

  useEffect(() => {
    let active = true;
    getDiscoverMetrics(sinceFor(period), source || null)
      .then((d) => { if (active) { setData(d); setError(""); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar as métricas."); })
      .finally(() => { if (active) setResolved(key); });
    return () => { active = false; };
  }, [period, source, key]);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [auto]);

  async function exportCsv(kind: ExportKind) {
    setExporting(kind);
    try { await downloadDiscoverCsv(kind, sinceFor(period), source || null); toast("Arquivo baixado. Registrado na auditoria.", "success"); }
    catch (e) { toast(e instanceof Error ? e.message : "Não foi possível exportar.", "error"); }
    finally { setExporting(null); }
  }

  const loading = resolved !== key && !data;
  const t = data?.totals, pp = data?.people, en = data?.engagement;
  const maxFunnel = Math.max(1, ...(data?.funnel.map((f) => f.people) ?? [0]));
  const timeline = (data?.timeline ?? []).slice(-72);
  const maxTimeline = Math.max(1, ...timeline.map((b) => b.people));
  const methodTotals = Object.entries((data?.methods ?? []).reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.method]: (acc[m.method] ?? 0) + m.count }), {}));
  const devices = (key2: "device" | "os" | "browser") => Object.entries((data?.devices ?? []).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d[key2]]: (acc[d[key2]] ?? 0) + d.n }), {})).sort((a, b) => b[1] - a[1]);
  const deviceLabel: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

  return (
    <div className="space-y-5">
      <div className="ui-panel flex flex-wrap items-end gap-3 p-4">
        <label className="ui-field min-w-44">Período<select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label className="ui-field min-w-44">Origem do QR<select value={source} onChange={(e) => setSource(e.target.value)}><option value="">Todas</option>{(data?.sources ?? []).filter((s) => s.source !== "(sem origem)").map((s) => <option key={s.source} value={s.source}>{s.source}</option>)}</select></label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-secondary"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />Atualizar a cada 30 s</label>
        <div className="ml-auto flex flex-wrap gap-2">
          {([["events", "Eventos"], ["votes", "Votos"], ["sessions", "Pessoas"], ["projects", "Projetos"]] as [ExportKind, string][]).map(([kind, label]) => (
            <button key={kind} type="button" disabled={exporting !== null} aria-busy={exporting === kind} onClick={() => void exportCsv(kind)} className="ui-button"><Download size={16} aria-hidden="true" />{label} (CSV)</button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="ui-error">{error}</p>}
      {loading ? <ListSkeleton rows={4} label="Carregando métricas do baralho" /> : data && t && pp && en && (
        <>
          {t.people === 0 ? <EmptyState title="Ainda não há dados do baralho">Quando alguém escanear o QR Code e abrir <strong>/descobrir</strong>, tudo aparece aqui.</EmptyState> : (
            <>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Pessoas (aparelhos)" value={num(t.people, 0)} hint={`${pp.voters} votaram · ${pp.no_vote} só olharam`} />
                <Stat tone="teal" label="Votos" value={num(t.votes_cast, 0)} hint={`${t.votes_current} votos atuais (${t.vote_changes} mudanças)`} />
                <Stat tone="accent" label="Curtidas" value={num(t.likes, 0)} hint={`${pct(t.like_rate)} dos votos · ${pp.likers} pessoas`} />
                <Stat tone="sun" label="Passes" value={num(t.dislikes, 0)} hint={`${pp.dislikers} pessoas`} />
                <Stat label="Votos por pessoa" value={num(en.avg_votes_per_person, 1)} hint={`mediana ${num(en.median_votes_per_person, 0)}`} />
                <Stat tone="teal" label="Chegaram ao fim" value={pct(en.completion_rate)} hint={`${pp.finished} pessoas`} />
                <Stat tone="accent" label="Tempo de uso" value={secs(en.avg_session_seconds)} hint={`mediana ${secs(en.median_session_seconds)}`} />
                <Stat tone="sun" label="Pico de gente" value={data.peak ? String(data.peak.people) : "–"} hint={data.peak ? `em 10 min, às ${hm(data.peak.bucket)}` : undefined} />
                <Stat label="Abriram detalhes" value={pct(en.details_rate)} hint={`${t.details_opens} aberturas · ${pp.details} pessoas`} />
                <Stat tone="teal" label="Foram à página do projeto" value={num(t.link_clicks, 0)} hint={`${pp.link_clicks} pessoas`} />
                <Stat tone="accent" label="Clicaram em criar conta" value={num(t.signup_clicks, 0)} hint={`${pp.signups} pessoas`} />
                <Stat tone="sun" label="Desistiram sem votar" value={pct(en.bounce_rate)} hint={`${pp.no_vote} pessoas`} />
              </dl>

              <div className="grid gap-5 lg:grid-cols-2">
                <Section title="Funil: onde as pessoas ficam">
                  <ol className="grid gap-3">{data.funnel.map((f, i) => <Bar key={f.step} label={f.step} value={f.people} max={maxFunnel} note={i > 0 && data.funnel[0].people ? `(${pct(f.people / data.funnel[0].people)})` : undefined} />)}</ol>
                </Section>
                <Section title="Votos por pessoa">
                  <ul className="grid gap-3">{en.votes_distribution.map((d) => <Bar key={d.label} label={d.label} value={d.people} max={Math.max(1, ...en.votes_distribution.map((x) => x.people))} />)}</ul>
                </Section>
              </div>

              <Section title="Movimento ao longo do evento (pessoas ativas a cada 10 minutos)">
                <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`Gráfico de pessoas ativas por 10 minutos. Pico de ${data.peak?.people ?? 0} pessoas.`}>
                  {timeline.map((b) => <div key={b.bucket} title={`${hm(b.bucket)}: ${b.people} pessoas, ${b.likes} curtidas, ${b.dislikes} passes`} className="min-w-[4px] flex-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (b.people / maxTimeline) * 100)}%` }} />)}
                </div>
                {timeline.length > 0 && <div className="mt-2 flex justify-between text-[12px] text-muted"><span>{hm(timeline[0].bucket)}</span><span>{hm(timeline[timeline.length - 1].bucket)}</span></div>}
              </Section>

              <Section title="Ranking e desempenho por projeto">
                <div role="region" aria-label="Desempenho por projeto: rolagem horizontal" tabIndex={0} className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
                    <thead className="text-[13px] text-muted"><tr><th>#</th><th>Projeto</th><th>Vistas</th><th>Curtidas</th><th>Passes</th><th>Aprovação</th><th>Detalhes</th><th>Página</th><th>Tempo p/ decidir</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {data.projects.map((p) => (
                        <tr key={p.project_id}>
                          <td className="font-heading font-extrabold text-secondary">{p.rank}</td>
                          <td><span className="font-semibold text-secondary">{p.name}</span>{p.category && <span className="block text-[12px] text-muted">{p.category}</span>}</td>
                          <td>{p.views}<span className="text-[12px] text-muted"> ({p.viewers} pess.)</span></td>
                          <td className="font-semibold text-accent-strong"><Heart size={13} className="mr-1 inline" aria-hidden="true" />{p.likes}</td>
                          <td>{p.dislikes}</td>
                          <td>{pct(p.approval)}</td>
                          <td>{p.details}<span className="text-[12px] text-muted"> ({p.details_liked} curt.)</span></td>
                          <td>{p.link_clicks}</td>
                          <td>{secs(p.avg_dwell_s)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <div className="grid gap-5 lg:grid-cols-2">
                <Section title="Como decidem">
                  <dl className="grid gap-2 text-[15px]">
                    <div className="flex justify-between gap-3"><dt className="text-muted">Tempo médio até curtir</dt><dd className="font-semibold text-secondary">{secs(en.avg_decision_seconds.like)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Tempo médio até passar</dt><dd className="font-semibold text-secondary">{secs(en.avg_decision_seconds.dislike)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Até o primeiro voto</dt><dd className="font-semibold text-secondary">{secs(en.avg_seconds_to_first_vote)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Tempo médio nos detalhes</dt><dd className="font-semibold text-secondary">{secs(en.avg_details_seconds)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Curtem mais quando abrem detalhes?</dt><dd className="font-semibold text-secondary">{pct(en.like_rate_with_details)} com · {pct(en.like_rate_without_details)} sem</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Desfizeram um voto</dt><dd className="font-semibold text-secondary">{t.undos} ({pp.undo} pessoas)</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Mudaram de ideia</dt><dd className="font-semibold text-secondary">{t.vote_changes} ({t.people_who_changed} votos)</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Hesitaram (arrastaram e soltaram)</dt><dd className="font-semibold text-secondary">{t.drag_cancels}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Voltaram depois</dt><dd className="font-semibold text-secondary">{pp.returned} pessoas</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Estavam logadas</dt><dd className="font-semibold text-secondary">{pp.logged_in} pessoas</dd></div>
                  </dl>
                </Section>
                <Section title="Como votaram">
                  <ul className="grid gap-3">{methodTotals.map(([m, n]) => <Bar key={m} label={METHODS[m] ?? m} value={n} max={Math.max(1, ...methodTotals.map((x) => x[1]))} />)}</ul>
                  {data.by_position.length > 0 && <>
                    <h4 className="mb-2 mt-5 text-[14px] font-semibold text-secondary">Taxa de curtida conforme avançam no baralho</h4>
                    <ul className="grid gap-1 text-[14px]">{data.by_position.map((b) => <li key={b.start} className="flex justify-between gap-3"><span className="text-muted">Projetos {b.start + 1} a {b.start + 5}</span><span className="font-semibold text-secondary">{pct(b.votes ? b.likes / b.votes : null)} <span className="font-normal text-muted">({b.votes} votos)</span></span></li>)}</ul>
                  </>}
                </Section>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Section title="Aparelhos"><ul className="grid gap-3">{devices("device").map(([d, n]) => <Bar key={d} label={deviceLabel[d] ?? d} value={n} max={t.people} />)}</ul></Section>
                <Section title="Sistemas e navegadores">
                  <ul className="grid gap-1 text-[14px]">{devices("os").map(([d, n]) => <li key={"os" + d} className="flex justify-between"><span className="text-muted">{d}</span><span className="font-semibold text-secondary">{n}</span></li>)}
                    {devices("browser").map(([d, n]) => <li key={"br" + d} className="flex justify-between"><span className="text-muted">{d}</span><span className="font-semibold text-secondary">{n}</span></li>)}</ul>
                </Section>
                <Section title="Origens do QR">
                  <ul className="grid gap-1 text-[14px]">{data.sources.map((s) => <li key={s.source} className="flex justify-between gap-3"><span className="text-muted">{s.source}</span><span className="font-semibold text-secondary">{s.people} pess. · {s.votes} votos</span></li>)}</ul>
                </Section>
              </div>

              {data.errors.length > 0 && <Section title={`Erros no aparelho das pessoas (${t.errors})`}><ul className="grid gap-1 text-[14px]">{data.errors.map((e) => <li key={e.message} className="flex justify-between gap-3"><span className="text-muted">{e.message}</span><span className="font-semibold text-danger">{e.n}</span></li>)}</ul></Section>}
            </>
          )}
        </>
      )}
      <EventQr />
    </div>
  );
}
