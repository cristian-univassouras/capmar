"use client";
import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, id: idProp, hint, type, ...props }, ref) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <span className="relative block">
        <input id={id} ref={ref} {...props} type={password && visible ? "text" : type} aria-describedby={hint ? id + "-hint" : props["aria-describedby"]} className={password ? "!pr-12" : undefined} />
        {password && (
          <button type="button" aria-label={(visible ? "Ocultar " : "Mostrar ") + label.toLowerCase()} aria-pressed={visible} onClick={() => setVisible((v) => !v)} className="ui-icon-button absolute right-0.5 top-1/2 -translate-y-1/2">
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </span>
      {hint && <span id={id + "-hint"} className="hint">{hint}</span>}
    </div>
  );
});

/** Erro de formulário: aparece com um tremor curto (zerado com movimento reduzido). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="ui-error shake">{message}</p>;
}

type SubmitButtonProps = { children: string; loadingLabel: string; loading?: boolean; done?: boolean };
export function SubmitButton({ children, loadingLabel, loading, done }: SubmitButtonProps) {
  return (
    <button type="submit" disabled={loading || done} aria-busy={loading || undefined} aria-label={loading ? loadingLabel : undefined} className={"ui-button ui-button-primary w-full !min-h-12 " + (loading ? "is-loading " : "") + (done ? "is-done" : "")}>
      {done ? <><Check size={18} aria-hidden="true" className="check-draw" />Pronto</> : <>{children}<ArrowRight size={17} aria-hidden="true" /></>}
    </button>
  );
}
