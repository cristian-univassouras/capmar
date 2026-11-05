"use client";

import { Check, TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string; leaving?: boolean };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ações destrutivas usam o botão de perigo. */
  danger?: boolean;
};

type Ctx = {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useToast precisa de FeedbackProvider");
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useConfirm precisa de FeedbackProvider");
  return ctx.confirm;
}

/**
 * Toasts (status educado, sem roubar foco) e diálogo de confirmação próprio
 * (no lugar do window.confirm). Um único provedor na raiz.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  useEffect(() => { document.documentElement.classList.add("js"); }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((items) => items.filter((t) => t.id !== id)), 240);
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-2), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 6500 : 4200);
  }, [dismiss]);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    opener.current = document.activeElement as HTMLElement | null;
    resolver.current = resolve;
    setOptions(opts);
    requestAnimationFrame(() => dialog.current?.showModal());
  }), []);

  function settle(value: boolean) {
    const el = dialog.current;
    if (el?.open) el.close();
    resolver.current?.(value);
    resolver.current = null;
    // Um novo confirm() aberto antes do fim da animação cancela este fechamento.
    closeTimer.current = window.setTimeout(() => { closeTimer.current = null; setOptions(null); opener.current?.focus?.(); }, 220);
  }

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast is-${t.kind} ${t.leaving ? "is-leaving" : ""}`}>
            {t.kind !== "info" && (
              <span className="toast-icon" aria-hidden="true">
                {t.kind === "success" ? <Check size={14} strokeWidth={3} /> : <TriangleAlert size={14} />}
              </span>
            )}
            <p className="min-w-0 flex-1">{t.message}</p>
          </div>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="ui-dialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onCancel={(e) => { e.preventDefault(); settle(false); }}
        onClick={(e) => { if (e.target === dialog.current) settle(false); }}
      >
        {options && (
          <div>
            <h2 id="confirm-title" className="font-heading text-xl font-bold text-secondary">{options.title}</h2>
            {options.message && <p id="confirm-message" className="mt-2 text-[15px] text-muted">{options.message}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="ui-button" onClick={() => settle(false)} autoFocus>{options.cancelLabel ?? "Cancelar"}</button>
              <button type="button" className={`ui-button ${options.danger ? "ui-button-danger" : "ui-button-primary"}`} onClick={() => settle(true)}>{options.confirmLabel ?? "Confirmar"}</button>
            </div>
          </div>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}
