import Image from "next/image";
import { Logo } from "@/app/_components/ui/Logo";
import { TileStrip } from "@/app/_components/ui/primitives";

type AuthShellProps = {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

/** Casca das telas de acesso. Entrada em CSS (320ms), que o CSS global já zera com movimento reduzido. */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      <aside className="relative hidden w-[40%] max-w-[560px] flex-col justify-between bg-primary-soft lg:flex">
        <div className="p-10 pb-0"><Logo /></div>
        <div className="px-10">
          <h2 className="font-heading text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] text-secondary">Maricá começa aqui.</h2>
          <p className="mt-5 max-w-sm text-lg text-gray-600">Mostre seu projeto para a cidade e encontre quem quer apoiar. Feito em Maricá, para Maricá.</p>
        </div>
        <div>
          <Image src="/capybara.png" alt="" width={1000} height={558} className="h-auto w-full object-cover" priority />
          <TileStrip />
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-10">
        <div className="page-enter w-full max-w-lg">
          <div className="mb-6 lg:hidden"><Logo /></div>
          <div className="ui-panel p-6 sm:p-9">
            <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-[-0.02em] text-secondary sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base text-gray-600">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          <div className="mt-6 text-center text-[15px] text-gray-600">{footer}</div>
        </div>
      </div>
    </main>
  );
}
