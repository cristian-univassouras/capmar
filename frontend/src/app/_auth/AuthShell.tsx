import Image from "next/image";
import { Logo } from "@/app/_components/ui/Logo";

type AuthShellProps = {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

const points = ["Projetos de gente de Maricá, abertos para qualquer pessoa ver", "Equipe, materiais e contato em um só lugar", "Mensagens diretas com quem quer apoiar"];

/** Casca das telas de acesso. Entrada em CSS (320ms), que o CSS global já zera com movimento reduzido. */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      <aside className="relative hidden w-[44%] max-w-[600px] flex-col gap-10 bg-secondary px-12 py-10 text-white lg:flex">
        <Logo tone="light" />
        <div className="flex flex-1 flex-col justify-center gap-8">
          <div>
            <h2 className="font-heading text-[44px] font-extrabold leading-[1.04] tracking-[-0.03em]">Maricá começa aqui.</h2>
            <ul className="mt-6 grid gap-3 text-base text-[#cfe0e6]">
              {points.map((point) => (
                <li key={point} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />{point}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-[20px] ring-1 ring-white/15">
            <Image src="/capybara.png" alt="" width={1000} height={558} className="h-auto w-full object-cover" priority />
          </div>
        </div>
        <p className="text-sm text-[#9fb6bf]">Feito em Maricá, para Maricá.</p>
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
