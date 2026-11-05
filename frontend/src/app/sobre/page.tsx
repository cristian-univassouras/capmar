import Link from "next/link";
import PublicFrame from "@/app/_components/PublicFrame";

const team = [
  { name: "Cristian Barboza", area: "Frontend" },
  { name: "Endriel Medeiros", area: "Frontend" },
  { name: "Felipe Sodré", area: "Backend" },
  { name: "Andrey Violante", area: "Backend" },
];

const h2 = "font-heading text-2xl font-bold tracking-tight text-secondary sm:text-3xl";
const body = "max-w-[68ch] text-base leading-relaxed text-gray-600";

export default function SobrePage() {
  return (
    <PublicFrame className="max-w-3xl">
      <div className="grid gap-12 pb-4 pt-2">
        <header className="grid gap-5">
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-secondary sm:text-5xl">Feito em Maricá, para Maricá.</h1>
          <p className="max-w-[60ch] text-lg leading-relaxed text-gray-600">
            Maricá tem gente criativa demais, com projetos bons demais, que ficam no papel por falta de visibilidade. O CapMar nasceu da vontade de mudar isso.
          </p>
        </header>

        <section className="grid gap-4" aria-labelledby="como-surgiu">
          <h2 id="como-surgiu" className={h2}>Como surgiu</h2>
          <p className={body}>
            Somos estudantes de Engenharia de Software da Universidade de Vassouras, campus Maricá. Durante o curso, ficou claro que a cidade tem um potencial enorme, mas falta um espaço digital onde empreendedores locais mostrem o que estão construindo.
          </p>
          <p className={body}>
            Não queríamos fazer mais um projeto acadêmico que some na gaveta. Queríamos algo que as pessoas usassem de verdade: um lugar onde quem tem uma ideia encontra quem quer apoiá-la, e o contrário também.
          </p>
        </section>

        <section className="grid gap-4 rounded-[20px] bg-primary-soft p-6 sm:p-8" aria-labelledby="o-que-e">
          <h2 id="o-que-e" className={h2}>O que é o CapMar</h2>
          <p className={body}>
            Uma vitrine de projetos locais. Quem cria apresenta a ideia, a equipe e os materiais, e recebe contato sem precisar disputar atenção em redes generalistas.
          </p>
          <p className={body}>
            Quem quer apoiar encontra projetos de Maricá com contexto suficiente para decidir se vale uma conversa. O CapMar não processa pagamentos: o apoio acontece pelo link que cada projeto informa e pelas mensagens.
          </p>
          <div><Link href="/home" className="ui-button ui-button-primary">Explorar projetos</Link></div>
        </section>

        <section className="grid gap-4" aria-labelledby="por-que-marica">
          <h2 id="por-que-marica" className={h2}>Por que Maricá?</h2>
          <p className={body}>
            Porque é a cidade onde estudamos, vivemos e vemos todo dia pessoas com capacidade técnica e criativa sem para onde levar suas ideias. Maricá está crescendo rápido, e queremos que esse crescimento chegue a todo mundo, não só a quem já tem rede de contatos.
          </p>
        </section>

        <section className="grid gap-5" aria-labelledby="quem-faz">
          <h2 id="quem-faz" className={h2}>Quem faz</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {team.map((dev, i) => (
              <li key={dev.name} className="ui-panel flex items-center gap-4 px-5 py-4">
                <span aria-hidden="true" className={"tile " + ["tile-a", "tile-b", "tile-c", "tile-d"][i] + " grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"}>
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface font-heading text-sm font-extrabold text-secondary">{dev.name[0]}</span>
                </span>
                <div>
                  <p className="font-semibold text-secondary">{dev.name}</p>
                  <p className="text-sm text-muted">{dev.area}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={body}>
            Projeto de extensão universitária desenvolvido com orientação acadêmica, mas com vontade própria de fazer algo que dure além da faculdade.
          </p>
        </section>
      </div>
    </PublicFrame>
  );
}
