"use client";
/* eslint-disable @next/next/no-img-element -- QR PNG gerado no navegador. */
import { useRef, useState } from "react";
import QRCode from "qrcode";

export default function ProjectShare({ id, name, visible }: { id: number; name: string; visible: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function open() {
    const clean = new URL("/projeto/" + id, window.location.origin).href;
    setUrl(clean); setMessage(""); setQr(""); dialog.current?.showModal();
    try { setQr(await QRCode.toDataURL(clean, { width: 768, margin: 4, errorCorrectionLevel: "M", color: { dark: "#421C77", light: "#FFFFFF" } })); }
    catch { setMessage("Não foi possível gerar o QR Code. Você ainda pode copiar o link."); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link copiado!"); }
    catch { setMessage("Selecione o endereço abaixo e copie o link."); }
  }
  async function nativeShare() {
    if (!navigator.share) { await copy(); return; }
    setBusy(true);
    try { await navigator.share({ title: name, text: "Conheça este projeto no CapMar", url }); }
    catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setMessage("Compartilhamento indisponível. Use Copiar link."); }
    finally { setBusy(false); }
  }
  if (!visible) return <p className="self-center text-xs text-gray-600">Divulgação disponível para projetos públicos.</p>;
  return <><button type="button" onClick={open} className="rounded-xl border border-gray-300 px-4 py-3">Compartilhar</button>
    <dialog ref={dialog} aria-labelledby="share-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-secondary/60">
      <div className="flex items-start justify-between gap-4"><h2 id="share-title" className="font-heading text-xl font-bold text-primary">Compartilhe este projeto</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar compartilhamento" className="rounded-lg px-3 py-2">✕</button></div>
      <p className="mt-2 break-words text-sm text-gray-600">{name}</p>
      {qr ? <img src={qr} alt={"QR Code para " + name} className="mx-auto my-3 h-48 w-48" /> : <p role="status" className="py-6 text-center">Gerando QR Code...</p>}
      <label className="block text-sm font-semibold">Link público<input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full min-w-0 rounded-xl border border-gray-300 p-3 text-sm font-normal" /></label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Copiar link</button>
        <button type="button" disabled={busy} onClick={nativeShare} className="rounded-xl border border-gray-300 px-4 py-3 disabled:opacity-50">Mais opções</button>
        {qr && <a href={qr} download={"capmar-projeto-" + id + ".png"} className="rounded-xl border border-gray-300 px-4 py-3">Baixar QR Code</a>}
        <a href={"https://wa.me/?text=" + encodeURIComponent(name + " — " + url)} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-gray-300 px-4 py-3">WhatsApp</a>
        <a href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-gray-300 px-4 py-3">LinkedIn</a>
      </div>
      <p className="mt-3 text-xs text-gray-600">O link e o QR Code permitem abrir o projeto sem conta enquanto ele for público.</p>
      {message && <p role="status" className="mt-3 rounded-xl bg-primary/5 p-3 text-sm text-primary">{message}</p>}
    </dialog>
  </>;
}
