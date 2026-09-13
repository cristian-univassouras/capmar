"use client";
import { useEffect, useState } from "react";
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
  return <div className="mx-auto max-w-xl space-y-6"><h1 className="text-3xl font-bold">Segurança da conta</h1>
    {notice && <p role="alert" className="rounded-xl bg-white p-4">{notice}</p>}
    {!me ? <p role="status">Consultando conta...</p> : <>
      <section className="space-y-4 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Autenticador em duas etapas</h2>
        <p>{me.mfa_enabled ? "MFA está ativo. O login exige senha e código do autenticador." : "Ative um autenticador TOTP para proteger sua conta. Administradores precisam de MFA."}</p>
        {!me.mfa_enabled && <form onSubmit={(e) => submit(e, secret ? "confirm" : "setup")} className="space-y-4">
          {secret && <div className="space-y-2"><p>Cadastre esta chave no seu autenticador. Ela expira em dez minutos. Guarde uma cópia em local seguro.</p><code className="block break-all rounded-xl bg-gray-100 p-3">{secret}</code></div>}
          <label className="block">Senha atual<input name="password" type="password" autoComplete="current-password" required className={input} /></label>
          {secret && <label className="block">Código do autenticador<input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className={input} /></label>}
          <button disabled={busy} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{busy ? "Aguarde..." : secret ? "Confirmar autenticador" : "Configurar autenticador"}</button>
        </form>}
      </section>
      <form aria-label="Alterar senha" onSubmit={(e) => submit(e, "password")} className="space-y-4 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Alterar senha</h2><p className="text-sm">A alteração encerra todas as sessões. Use no mínimo 12 caracteres e no máximo 72 bytes UTF-8.</p>
        <label className="block">Senha atual<input name="password" type="password" autoComplete="current-password" required className={input} /></label>
        <label className="block">Nova senha<input name="new_password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required className={input} /></label>
        {me.mfa_enabled && <label className="block">Código do autenticador<input name="otp" pattern="[0-9]{6}" maxLength={6} inputMode="numeric" required className={input} /></label>}
        <button disabled={busy} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">Alterar senha e encerrar sessões</button>
      </form>
      <p className="text-sm text-gray-600">Perdeu o acesso ao autenticador? Solicite recuperação ao responsável pelo sistema; a identidade será verificada e a operação ficará registrada.</p>
    </>}
  </div>;
}
