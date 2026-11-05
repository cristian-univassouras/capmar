"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, KeyRound, Smartphone, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getMe, getStoredUser, saveUser, type User } from "@/lib/api";
import { setupMfa, confirmMfa, changePassword } from "@/lib/engagement";
import { useToast } from "@/app/_components/ui/feedback";
import { Skeleton } from "@/app/_components/ui/primitives";

export default function SecurityPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<User | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [shake, setShake] = useState(0);

  // Reaproveita o usuário guardado pela casca; só consulta /auth/me se não houver cópia.
  useEffect(() => {
    let active = true;
    const sync = () => { const stored = getStoredUser(); if (active && stored) setMe(stored); };
    sync();
    window.addEventListener("capmar-user-changed", sync);
    if (!getStoredUser()) getMe().then((u) => { if (active) saveUser(u); }).catch((e) => { if (active) setNotice(e.message); });
    return () => { active = false; window.removeEventListener("capmar-user-changed", sync); };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>, action: "setup" | "confirm" | "password") {
    event.preventDefault(); setBusy(true); setNotice("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const otp = String(data.get("otp") || "");
    try {
      if (action === "setup") setSecret((await setupMfa(password)).secret);
      else {
        const result = action === "confirm" ? await confirmMfa(password, otp) : await changePassword(password, String(data.get("new_password")), otp);
        setSecret(""); toast(result.detail);
        router.replace("/login");
      }
    } catch (err) { setNotice(err instanceof Error ? err.message : "Falha na operação"); setShake((n) => n + 1); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="ui-page-heading"><div><h1>Segurança da conta</h1><p>Cuide do seu acesso e escolha uma proteção extra para sua conta.</p></div><Link href="/perfil" className="ui-button">Voltar ao perfil</Link></div>
    {notice && <p key={shake} role="alert" className="ui-error shake">{notice}</p>}
    {!me
      ? <div role="status" aria-busy="true" aria-label="Consultando conta" className="grid gap-4"><Skeleton className="h-24 w-full !rounded-2xl" /><Skeleton className="h-20 w-full !rounded-2xl" /><Skeleton className="h-20 w-full !rounded-2xl" /></div>
      : <>
        <div className="security-overview">
          <span aria-hidden="true"><ShieldCheck size={29} /></span>
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-bold text-secondary">{me.mfa_enabled ? "Sua conta tem proteção em duas etapas." : "Deixe sua conta mais protegida."}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{me.mfa_enabled ? "Além da senha, um código do seu aplicativo confirma que é você." : "Um aplicativo autenticador acrescenta uma confirmação extra ao entrar."}</p>
          </div>
          <span key={String(me.mfa_enabled)} className={"security-badge inline-flex items-center gap-1.5 " + (me.mfa_enabled ? "is-on" : "")}>
            {me.mfa_enabled && <svg className="check-draw" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            {me.mfa_enabled ? "Ativada" : "Não ativada"}
          </span>
        </div>
        <div className="space-y-4">
          <details className="security-setting ui-panel">
            <summary><span className="security-setting-icon" aria-hidden="true"><KeyRound size={21} /></span><span className="flex-1"><strong>Alterar senha</strong><span>Use uma senha exclusiva para o CapMar.</span></span><ChevronDown className="chev shrink-0" size={18} aria-hidden="true" /></summary>
            <form aria-label="Alterar senha" onSubmit={(e) => submit(e, "password")} className="security-setting-body">
              <p className="ui-notice">Ao salvar, suas sessões serão encerradas. Você precisará entrar novamente com a nova senha.</p>
              <label className="ui-field">Senha atual<input name="password" type="password" autoComplete="current-password" required /></label>
              <label className="ui-field">Nova senha<input aria-label="Nova senha" aria-describedby="password-guidance" name="new_password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /><span id="password-guidance" className="hint">Pelo menos 12 caracteres. Prefira uma frase longa e exclusiva.</span></label>
              {me.mfa_enabled && <label className="ui-field">Código do autenticador<input name="otp" pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" required /></label>}
              <button disabled={busy} className={"ui-button ui-button-primary " + (busy ? "is-loading" : "")}>Alterar senha e encerrar sessões</button>
            </form>
          </details>
          <details className="security-setting ui-panel">
            <summary><span className="security-setting-icon" aria-hidden="true"><Smartphone size={21} /></span><span className="flex-1"><strong>Autenticador em duas etapas</strong><span>{me.mfa_enabled ? "Proteção extra ativada na sua conta." : "Confirme o acesso com um código no celular."}</span></span><ChevronDown className="chev shrink-0" size={18} aria-hidden="true" /></summary>
            <div className="security-setting-body">
              <p className="text-[15px] leading-relaxed text-muted">{me.mfa_enabled ? "A verificação em duas etapas está ativa. O login exige senha e código do autenticador." : "Use um aplicativo autenticador compatível, como Google Authenticator ou Microsoft Authenticator. Para começar, confirme sua senha atual."}</p>
              {!me.mfa_enabled && <form onSubmit={(e) => submit(e, secret ? "confirm" : "setup")} className="space-y-4">
                {secret && <div className="ui-notice"><p className="leading-relaxed">Adicione esta chave ao seu aplicativo. Ela vale por dez minutos.</p><code className="my-3 block break-all rounded-lg bg-surface p-3 text-sm text-foreground">{secret}</code><p className="text-[13px]">Não compartilhe esta chave. Confirme abaixo o código exibido no aplicativo.</p></div>}
                <label className="ui-field">Senha atual<input name="password" type="password" autoComplete="current-password" required /></label>
                {secret && <label className="ui-field">Código do autenticador<input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label>}
                <button disabled={busy} className={"ui-button ui-button-primary " + (busy ? "is-loading" : "")}>{secret ? "Confirmar autenticador" : "Configurar autenticador"}</button>
              </form>}
            </div>
          </details>
        </div>
        <aside className="ui-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div><h2 className="font-heading text-base font-bold text-secondary">Precisa de ajuda para entrar?</h2><p className="mt-1 text-sm text-muted">Se perdeu o acesso ao autenticador, entre em contato com a equipe.</p></div>
          <Link href="/ajuda" className="ui-button">Central de ajuda</Link>
        </aside>
      </>}
  </div>;
}
