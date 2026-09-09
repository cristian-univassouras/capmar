"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const smoothEase = [0.16, 1, 0.3, 1] as const;

type AuthShellProps = {
  kicker: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export default function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Painel da marca (desktop) */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-primary p-14 text-white lg:flex">
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-secondary/40 blur-3xl" />

        <Link
          href="/"
          className="relative font-heading text-3xl font-black leading-none tracking-tighter"
        >
          CAP<br />MAR
        </Link>

        <div className="relative">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="font-heading text-5xl font-black uppercase leading-[0.95] tracking-tighter"
          >
            Maricá<br />começa<br />aqui.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: smoothEase }}
            className="mt-6 max-w-sm text-lg leading-relaxed text-white/70"
          >
            Conecte seu projeto a quem quer investir nele. Visibilidade real para
            empreendedores e projetistas locais.
          </motion.p>
        </div>

        <p className="relative text-sm text-white/40">
          Feito em Maricá, para Maricá.
        </p>
      </div>

      {/* Área do formulário */}
      <div className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="w-full max-w-md"
        >
          {/* Logo (mobile) */}
          <Link
            href="/"
            className="mb-10 inline-block font-heading text-2xl font-black leading-none tracking-tighter text-primary lg:hidden"
          >
            CAP<br />MAR
          </Link>

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            {kicker}
          </p>
          <h1 className="font-heading text-4xl font-black uppercase leading-none tracking-tighter text-primary sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-gray-600">{subtitle}</p>

          <div className="mt-10">{children}</div>

          <div className="mt-8 text-center text-sm text-gray-600">{footer}</div>
        </motion.div>
      </div>
    </main>
  );
}
