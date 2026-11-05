"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, KeyRound, Smartphone, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getMe, type User } from "@/lib/api";
import { setupMfa, confirmMfa, changePassword } from "@/lib/engagement";
const input = "mt-1 w-full rounded-xl border border-gray-300 p-3";
export default function SecurityPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { getMe().then(setMe).catch((e) => setNotice(e.message)); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>, action: "setup" | "confirm" | "password") {
    event.preventDefault(); setBusy(true); setNotice("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const otp = String(data.get("otp") || "");
    try {
      if (action === "setup") setSecret((await setupMfa(password)).secret);
      else {
        const result = action === "confirm" ? await confirmMfa(password, otp) : await changePassword(password, String(data.get("new_password")), otp);
        setSecret(""); setNotice(result.detail);
        router.replace("/login");
      }
    } catch (err) { setNotice(err instanceof Error ? err.message : "Falha na operação"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6"><div className="ui-page-heading"><div><p className="ui-eyebrow">Minha conta</p><h1 className="mt-2">Segurança da conta</h1><p>Cuide do seu acesso e escolha uma proteção extra para sua conta.</p></div><Link href="/perfil" className="ui-button">Voltar ao perfil</Link></div>
    {notice&&<p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{notice}</p>}
    {!me?<p role="status">Consultando conta...</p>:<><div className="security-overview"><span><ShieldCheck size={29}/></span><div className="min-w-0"><h2 className="font-heading text-xl font-bold text-secondary">{me.mfa_enabled?"Sua conta tem proteção em duas etapas.":"Deixe sua conta mais protegida."}</h2><p className="mt-2 text-sm leading-relaxed text-gray-500">{me.mfa_enabled?"Além da senha, um código do seu aplicativo confirma que é você.":"Um aplicativo autenticador acrescenta uma confirmação extra ao entrar."}</p></div><span className={"security-badge "+(me.mfa_enabled?"is-on":"")}>{me.mfa_enabled?"Ativada":"Não ativada"}</span></div>
    <div className="space-y-4"><details className="security-setting ui-panel"><summary><span className="security-setting-icon"><KeyRound size={21}/></span><span className="flex-1"><strong>Alterar senha</strong><span>Use uma senha exclusiva para o CapMar.</span></span><ChevronDown size={18}/></summary><form aria-label="Alterar senha" onSubmit={e=>submit(e,"password")} className="security-setting-body"><p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Ao salvar, suas sessões serão encerradas. Você precisará entrar novamente com a nova senha.</p><label className="block text-sm font-semibold">Senha atual<input name="password" type="password" autoComplete="current-password" required className={input}/></label><label className="block text-sm font-semibold">Nova senha<input aria-label="Nova senha" aria-describedby="password-guidance" name="new_password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required className={input}/><span id="password-guidance" className="mt-2 block text-xs font-normal text-gray-500">Pelo menos 12 caracteres. Prefira uma frase longa e exclusiva.</span></label>{me.mfa_enabled&&<label className="block text-sm font-semibold">Código do autenticador<input name="otp" pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" required className={input}/></label>}<button disabled={busy} className="ui-button ui-button-primary">{busy?"Aguarde...":"Alterar senha e encerrar sessões"}</button></form></details>
    <section><details className="security-setting ui-panel"><summary><span className="security-setting-icon"><Smartphone size={21}/></span><span className="flex-1"><strong>Autenticador em duas etapas</strong><span>{me.mfa_enabled?"Proteção extra ativada na sua conta.":"Confirme o acesso com um código no celular."}</span></span><ChevronDown size={18}/></summary><div className="security-setting-body"><h2 className="sr-only">Autenticador em duas etapas</h2><p className="text-sm leading-relaxed text-gray-500">{me.mfa_enabled?"MFA está ativo. O login exige senha e código do autenticador.":"Use um aplicativo autenticador compatível, como Google Authenticator ou Microsoft Authenticator. Para começar, confirme sua senha atual."}</p>{!me.mfa_enabled&&<form onSubmit={e=>submit(e,secret?"confirm":"setup")} className="space-y-4">{secret&&<div className="rounded-xl bg-primary/5 p-4"><p className="text-sm leading-relaxed text-primary">Adicione esta chave ao seu aplicativo. Ela vale por dez minutos.</p><code className="my-3 block break-all rounded-lg bg-white p-3 text-sm">{secret}</code><p className="text-xs text-gray-500">Não compartilhe esta chave. Confirme abaixo o código exibido no aplicativo.</p></div>}<label className="block text-sm font-semibold">Senha atual<input name="password" type="password" autoComplete="current-password" required className={input}/></label>{secret&&<label className="block text-sm font-semibold">Código do autenticador<input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required className={input}/></label>}<button disabled={busy} className="ui-button ui-button-primary">{busy?"Aguarde...":secret?"Confirmar autenticador":"Configurar autenticador"}</button></form>}</div></details></section></div>
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-primary/20 p-5"><div><h2 className="text-sm font-semibold text-secondary">Precisa de ajuda para entrar?</h2><p className="mt-1 text-xs text-gray-500">Se perdeu o acesso ao autenticador, entre em contato com a equipe.</p></div><Link href="/ajuda" className="text-sm font-semibold text-primary underline underline-offset-4">Central de ajuda</Link></aside></>}
  </div>;
}
