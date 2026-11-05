"use client";
/* eslint-disable @next/next/no-img-element -- QR PNG gerado no navegador. */
import { useRef, useState } from "react";
import { Copy, Download, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/app/_components/ui/feedback";

const secondaryLink = "ui-button";

export default function ProjectShare({ id, name, visible }: { id: number; name: string; visible: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function open() {
    const clean = new URL("/projeto/" + id, window.location.origin).href;
    setUrl(clean); setMessage(""); setQr(""); dialog.current?.showModal();
    try { setQr(await QRCode.toDataURL(clean, { width: 768, margin: 4, errorCorrectionLevel: "M", color: { dark: "#0e2f3c", light: "#FFFFFF" } })); }
    catch { setMessage("Não foi possível gerar o QR Code. Você ainda pode copiar o link."); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link copiado!"); toast("Link copiado", "success"); }
    catch { setMessage("Selecione o endereço abaixo e copie o link."); }
  }
  async function nativeShare() {
    if (!navigator.share) { await copy(); return; }
    setBusy(true);
    try { await navigator.share({ title: name, text: "Conheça este projeto no CapMar", url }); }
    catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setMessage("Compartilhamento indisponível. Use Copiar link."); }
    finally { setBusy(false); }
  }
  if (!visible) return <p className="self-center text-[13px] text-muted">Divulgação disponível para projetos públicos.</p>;
  return <>
    <button type="button" onClick={open} className="ui-button"><Share2 size={18} aria-hidden="true" />Compartilhar</button>
    <dialog ref={dialog} aria-labelledby="share-title" className="ui-dialog" onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
      <div className="flex items-start justify-between gap-4">
        <h2 id="share-title" className="font-heading text-xl font-bold text-secondary">Compartilhe este projeto</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar compartilhamento" className="ui-icon-button -mr-2 -mt-2"><X size={20} aria-hidden="true" /></button>
      </div>
      <p className="mt-1 break-words text-[15px] text-muted">{name}</p>
      {qr
        ? <img src={qr} alt={"QR Code para " + name} className="mx-auto my-4 h-48 w-48 rounded-xl border border-line" />
        : <p role="status" className="py-8 text-center text-[15px] text-muted">Gerando QR Code...</p>}
      <label className="ui-field">Link público<input readOnly value={url} onFocus={(e) => e.currentTarget.select()} /></label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="ui-button ui-button-primary"><Copy size={18} aria-hidden="true" />Copiar link</button>
        <button type="button" disabled={busy} onClick={nativeShare} className="ui-button">Mais opções</button>
        {qr && <a href={qr} download={"capmar-projeto-" + id + ".png"} className={secondaryLink}><Download size={18} aria-hidden="true" />Baixar QR Code</a>}
        <a href={"https://wa.me/?text=" + encodeURIComponent(name + " — " + url)} target="_blank" rel="noopener noreferrer" className={secondaryLink}>WhatsApp</a>
        <a href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className={secondaryLink}>LinkedIn</a>
      </div>
      <p className="mt-4 text-[13px] text-muted">O link e o QR Code permitem abrir o projeto sem conta enquanto ele for público.</p>
      {message && <p role="status" className="ui-notice mt-3">{message}</p>}
    </dialog>
  </>;
}
