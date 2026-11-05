import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, FolderKanban, MessagesSquare, Users } from "lucide-react";
import PublicHeader from "@/app/_components/PublicHeader";
import Footer from "@/app/_landing/layout/Footer";
import FeaturedProjects from "@/app/_landing/FeaturedProjects";
import CommunityCTA from "@/app/_components/CommunityCTA";
import { Reveal, TileStrip } from "@/app/_components/ui/primitives";

const steps = [
  { icon: FolderKanban, tile: "tile-a", title: "Conte a história do projeto", text: "Crie sua conta, escolha um nome e descreva o que você faz ou quer fazer. Capa, imagens e PDFs entram quando você tiver." },
  { icon: Users, tile: "tile-b", title: "Mostre quem está junto", text: "Monte a equipe, liste parceiros e deixe claro quem responde pelo projeto. Quem apoia quer saber com quem está falando." },
  { icon: MessagesSquare, tile: "tile-d", title: "Receba contato e apoio", text: "Publique, compartilhe o link ou o QR Code e converse pelas mensagens. Se você aceita apoio, o link de contribuição fica na página do projeto." },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="stagger max-w-xl">
            <h1 style={{ ["--i" as string]: 0 }} className="font-heading text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-secondary sm:text-6xl">
              A vitrine dos projetos de Maricá.
            </h1>
            <p style={{ ["--i" as string]: 1 }} className="mt-6 max-w-[52ch] text-lg text-muted">
              Veja o que gente da cidade está construindo, ou apresente o seu. Para olhar, não precisa de conta.
            </p>
            <div style={{ ["--i" as string]: 2 }} className="mt-8 flex flex-wrap gap-3">
              <Link href="/home" className="ui-button ui-button-primary !px-6">Explorar projetos<ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link href="/projetos" className="ui-button !px-6">Apresentar meu projeto</Link>
            </div>
          </div>
          <div className="rise" style={{ animationDelay: "180ms" }}>
            <Image
              src="/capybara.png"
              alt="Capivara do CapMar sentada na grama, cercada de corações e curtidas"
              width={2000}
              height={1116}
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="h-auto w-full rounded-[24px] object-cover"
            />
          </div>
        </section>

        <TileStrip />

        <section aria-labelledby="titulo-projetos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <h2 id="titulo-projetos" className="mb-8 max-w-2xl font-heading text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">Quem já está na vitrine</h2>
          </Reveal>
          <Reveal index={1}><FeaturedProjects /></Reveal>
        </section>

        <section aria-labelledby="titulo-apoiar" className="bg-secondary text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 id="titulo-apoiar" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Quer apoiar um projeto da sua cidade?</h2>
              <p className="mt-5 max-w-[52ch] text-base text-[#cfe0e6]">Você não precisa de conta para conhecer. Abra um projeto, veja quem faz e decida se quer conversar.</p>
              <Link href="/home" className="ui-button mt-8 !border-white !bg-white !text-secondary hover:!bg-primary-soft">Ver projetos para apoiar<ArrowUpRight size={18} aria-hidden="true" /></Link>
            </Reveal>
            <Reveal index={1}>
              <dl className="grid gap-6 text-base">
                <div><dt className="font-heading text-xl font-bold">Veja quem está por trás</dt><dd className="mt-1 text-[#cfe0e6]">Cada projeto mostra a pessoa ou a equipe responsável, o que já existe e os materiais enviados.</dd></div>
                <div><dt className="font-heading text-xl font-bold">Fale direto com a pessoa</dt><dd className="mt-1 text-[#cfe0e6]">Com uma conta, você manda mensagem pelo perfil de quem criou o projeto.</dd></div>
                <div><dt className="font-heading text-xl font-bold">Apoie fora da plataforma</dt><dd className="mt-1 text-[#cfe0e6]">O CapMar não processa pagamentos. Quando o projeto aceita apoio, o link informado por ele aparece na página.</dd></div>
              </dl>
            </Reveal>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal>
            <h2 id="titulo-como" className="font-heading text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">Como funciona para quem cria</h2>
            <p className="mt-5 max-w-[44ch] text-base text-muted">Três passos, no seu ritmo. Você pode salvar como rascunho e publicar quando estiver pronto.</p>
          </Reveal>
          <ol className="grid gap-0 divide-y divide-line border-y border-line">
            {steps.map(({ icon: Icon, tile, title, text }, i) => (
              <Reveal as="li" index={i} key={title} className="flex gap-5 py-7">
                <span className={"tile " + tile + " grid h-14 w-14 shrink-0 place-items-center rounded-[14px]"} aria-hidden="true">
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface text-secondary"><Icon size={20} /></span>
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-secondary">{title}</h3>
                  <p className="mt-2 max-w-[56ch] text-base text-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <Reveal><CommunityCTA /></Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
