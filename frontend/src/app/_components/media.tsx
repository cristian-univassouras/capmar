"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { mediaUrl, uploadImage, type Author, type User } from "@/lib/api";

/** Pares de cor de azulejo (fundo suave + tinta escura, todos acima de 4.5:1). */
const AVATAR_TONES = [
  { bg: "var(--primary-soft)", fg: "var(--primary-strong)" },
  { bg: "var(--teal-soft)", fg: "#0a5b63" },
  { bg: "var(--accent-soft)", fg: "var(--accent-strong)" },
  { bg: "var(--sun-soft)", fg: "#7a5410" },
  { bg: "var(--success-soft)", fg: "#17543a" },
] as const;

function toneFor(user: Author | User | null) {
  const seed = String(user?.user_id ?? user?.username ?? "capmar");
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Exibe o avatar do usuário (imagem enviada) ou a inicial sobre uma cor de azulejo fixa por usuário. */
export function Avatar({
  user,
  className = "w-10 h-10 text-sm",
}: {
  user: Author | User | null;
  className?: string;
}) {
  const src = mediaUrl(user?.avatar_url);
  const initial = (user?.first_name || user?.username || "U")[0].toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={user ? "Foto de @" + user.username : "Foto de perfil"}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  const tone = toneFor(user);
  return (
    <div
      aria-hidden="true"
      style={{ background: tone.bg, color: tone.fg }}
      className={`rounded-full flex items-center justify-center font-heading font-extrabold shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}

type ImagePickerProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  variant?: "cover" | "square" | "compact";
  hint?: string;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
};

/** Botão de upload de imagem com preview. Sobe o arquivo e devolve o caminho /uploads/... */
export function ImagePicker({ value, onChange, variant = "cover", hint, label = "Imagem", onBusyChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = mediaUrl(value);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("A imagem deve ter no máximo 5 MB."); return; }
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box = variant === "compact" ? "w-auto min-h-11 rounded-xl px-4 gap-2" : variant === "square" ? "w-24 h-24 rounded-2xl flex-col gap-1 text-center leading-tight" : "w-full h-32 rounded-xl flex-col gap-1";

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label + (value ? ": trocar imagem" : ": enviar imagem")}
        className={`group relative ${box} overflow-hidden border-2 border-dashed border-line bg-surface-2 flex items-center justify-center text-muted hover:border-primary hover:text-primary hover:bg-primary-soft transition-colors`}
      >
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-secondary/80 p-2 flex items-center justify-center text-white text-[13px] font-semibold">
              {busy ? "Enviando..." : "Trocar"}
            </span>
          </>
        ) : (
          <><ImagePlus size={16} aria-hidden="true"/><span className="text-[13px] font-semibold">{busy ? "Enviando..." : variant === "compact" ? "Adicionar imagem" : "Enviar imagem"}</span></>
        )}
      </button>
      <div className="flex items-center gap-1 mt-1">
        {hint && variant !== "compact" && <p className="text-[13px] text-muted">{hint}</p>}
        {value && (
          <button
            type="button"
            disabled={busy}
            aria-label={"Remover " + label.toLowerCase()}
            onClick={() => onChange(null)}
            className="inline-flex min-h-11 items-center px-1 text-[13px] font-semibold text-muted hover:text-danger"
          >
            Remover
          </button>
        )}
      </div>
      {variant !== "compact" && <p className="mt-1 text-[13px] text-muted">JPEG, PNG, WebP ou GIF estático. Máximo de 5 MB.</p>}
      {error && <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{error}</p>}
      <input aria-label={label} ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />
    </div>
  );
}
