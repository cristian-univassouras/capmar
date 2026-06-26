"use client";

import { forwardRef } from "react";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, id, ...props },
  ref
) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <input
        id={id}
        ref={ref}
        {...props}
        className="w-full rounded-full border border-gray-200 bg-white px-6 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
});

type SubmitButtonProps = {
  children: string;
  loadingLabel: string;
  loading?: boolean;
};

/** Botão-assinatura da marca: texto que desliza no hover. */
export function SubmitButton({ children, loadingLabel, loading }: SubmitButtonProps) {
  if (loading) {
    return (
      <button
        type="submit"
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-bold text-white opacity-80"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        {loadingLabel}
      </button>
    );
  }

  return (
    <button
      type="submit"
      className="group relative w-full overflow-hidden rounded-full border border-primary bg-primary px-8 py-4 text-base font-bold transition-all duration-700 hover:bg-white"
    >
      <span className="relative flex items-center justify-center">
        <span className="text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-150%]">
          {children}
        </span>
        <span className="absolute text-primary transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[150%] group-hover:translate-y-0">
          {children}
        </span>
      </span>
    </button>
  );
}
