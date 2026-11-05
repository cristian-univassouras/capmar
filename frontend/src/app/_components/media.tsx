"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { mediaUrl, uploadImage, type Author, type User } from "@/lib/api";

/** Exibe o avatar do usuário (imagem enviada) ou a inicial como fallback. */
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
        alt={user?.username ?? "avatar"}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 ${className}`}
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

  const box = variant === "compact" ? "w-auto h-10 rounded-xl px-4 gap-2" : variant === "square" ? "w-24 h-24 rounded-2xl" : "w-full h-32 rounded-xl";

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label + (value ? ": trocar imagem" : ": enviar imagem")}
        className={`group relative ${box} overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 hover:border-primary/40 hover:text-primary transition-colors`}
      >
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex items-center justify-center text-white text-xs font-semibold">
              {busy ? "Enviando..." : "Trocar"}
            </span>
          </>
        ) : (
          <><ImagePlus size={16} aria-hidden="true"/><span className="text-xs font-semibold">{busy ? "Enviando..." : variant === "compact" ? "Adicionar imagem" : "Enviar imagem"}</span></>
        )}
      </button>
      <div className="flex items-center gap-3 mt-1.5">
        {hint && variant !== "compact" && <p className="text-xs text-gray-400">{hint}</p>}
        {value && (
          <button
            type="button"
            disabled={busy}
            aria-label={"Remover " + label.toLowerCase()}
            onClick={() => onChange(null)}
            className="text-xs text-gray-400 hover:text-accent"
          >
            Remover
          </button>
        )}
      </div>
      {variant !== "compact" && <p className="mt-2 text-xs text-gray-600">JPEG, PNG, WebP ou GIF estático. Máximo de 5 MB.</p>}
      {error && <p role="alert" className="text-xs text-accent mt-1">{error}</p>}
      <input aria-label={label} ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />
    </div>
  );
}
