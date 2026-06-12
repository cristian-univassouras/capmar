import Navbar from "@/app/_landing/layout/Navbar";
import Footer from "@/app/_landing/layout/Footer";

export default function SobrePage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-40 pb-24 flex flex-col gap-20">

        {/* Hero */}
        <div>
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-4">Sobre o CapMar</p>
          <h1 className="font-heading font-black text-5xl md:text-7xl uppercase tracking-tighter text-primary leading-none mb-8">
            Feito em<br />Maricá,<br />para Maricá.
          </h1>
          <p className="text-gray-600 text-xl leading-relaxed">
            Maricá tem gente criativa demais, com projetos bons demais, que ficam no papel por falta de visibilidade.
            O CapMar nasceu da vontade de mudar isso.
          </p>
        </div>

        {/* Origem */}
        <div className="flex flex-col gap-6">
          <h2 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">
            Como surgiu
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Somos estudantes de Engenharia de Software da Universidade de Vassouras — Campus Maricá.
            Durante o curso, ficou claro pra gente que a cidade tem um potencial enorme, mas falta um
            espaço digital onde empreendedores locais possam mostrar o que estão construindo.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Não queríamos fazer mais um projeto acadêmico que some na gaveta. Queríamos construir algo
            que as pessoas de verdade pudessem usar — um lugar onde quem tem uma ideia encontra quem
            quer investir nela, e vice-versa.
          </p>
        </div>

        {/* O que é */}
        <div className="bg-primary rounded-[40px] p-10 md:p-14 text-white flex flex-col gap-6">
          <h2 className="font-heading font-black text-3xl uppercase tracking-tighter">
            O que é o CapMar
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            Uma rede social focada em projetos. Aqui, projetistas e microempreendedores de Maricá
            criam seu perfil, publicam o que estão fazendo e constroem uma audiência real — sem
            precisar brigar por atenção em redes generalistas.
          </p>
          <p className="text-white/80 text-lg leading-relaxed">
            Do lado de quem investe, a plataforma oferece uma vitrine curada de projetos locais,
            com contexto suficiente pra tomar uma boa decisão de apoio.
          </p>
        </div>

        {/* Por que Maricá */}
        <div className="flex flex-col gap-6">
          <h2 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">
            Por que Maricá?
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Porque é a cidade onde estudamos, onde vivemos e onde vemos todo dia pessoas com
            capacidade técnica e criativa que não têm para onde ir com suas ideias. Maricá está
            crescendo rápido — a gente quer que esse crescimento chegue em todo mundo, não só
            em quem já tem rede de contatos.
          </p>
        </div>

        {/* Equipe */}
        <div className="flex flex-col gap-8">
          <h2 className="font-heading font-black text-3xl text-primary uppercase tracking-tighter">
            Quem faz
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Cristian Barboza", area: "Frontend" },
              { name: "Endriel Medeiros", area: "Frontend" },
              { name: "Felipe Sodré",     area: "Backend"  },
              { name: "Andrey Violante",  area: "Backend"  },
            ].map((dev) => (
              <div
                key={dev.name}
                className="bg-white rounded-[28px] px-7 py-6 flex items-center gap-4 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-black shrink-0">
                  {dev.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{dev.name}</p>
                  <p className="text-sm text-gray-400">{dev.area}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-base leading-relaxed">
            Projeto de extensão universitária desenvolvido com orientação acadêmica, mas com
            vontade própria de fazer algo que dure além da faculdade.
          </p>
        </div>

      </div>

      <Footer />
    </main>
  );
}
