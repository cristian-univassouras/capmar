import Link from "next/link";

const popularProjects = [
  {
    id: 1,
    name: "EcoTrack",
    tagline: "Monitore sua pegada de carbono com IA",
    tags: ["IA", "Sustentável", "Mobile"],
    team: "DevSquad",
    university: "Univ. Vassouras",
    members: 4,
    likes: 312,
    views: "1.2k",
    status: "Em Desenvolvimento",
    gradient: "from-green-400/20 to-emerald-600/20",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 2,
    name: "FinHelp",
    tagline: "Educação financeira para universitários",
    tags: ["Fintech", "Educação", "Web"],
    team: "InovaLab",
    university: "Univ. Vassouras",
    members: 3,
    likes: 278,
    views: "980",
    status: "Beta",
    gradient: "from-blue-400/20 to-indigo-600/20",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    name: "UrbanAI",
    tagline: "Análise preditiva de mobilidade urbana",
    tags: ["IA", "Dados", "Cidade"],
    team: "DataCrew",
    university: "Univ. Vassouras",
    members: 5,
    likes: 241,
    views: "870",
    status: "Em Desenvolvimento",
    gradient: "from-purple-400/20 to-violet-600/20",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    id: 4,
    name: "MedConnect",
    tagline: "Conectando estudantes de medicina a casos reais",
    tags: ["Saúde", "Educação", "Mobile"],
    team: "HealthBridge",
    university: "Univ. Vassouras",
    members: 6,
    likes: 198,
    views: "740",
    status: "Em Desenvolvimento",
    gradient: "from-rose-400/20 to-red-500/20",
    badge: "bg-rose-100 text-rose-700",
  },
  {
    id: 5,
    name: "DataVis",
    tagline: "Dashboard open-source para visualização de dados públicos",
    tags: ["Open Source", "Data", "Dashboard"],
    team: "DevSquad",
    university: "Univ. Vassouras",
    members: 3,
    likes: 187,
    views: "690",
    status: "Concluído",
    gradient: "from-amber-400/20 to-orange-500/20",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: 6,
    name: "AgriSmart",
    tagline: "Tecnologia de precisão para pequenos agricultores",
    tags: ["IoT", "Agro", "Sustentável"],
    team: "TechRural",
    university: "Univ. Vassouras",
    members: 4,
    likes: 156,
    views: "520",
    status: "Em Desenvolvimento",
    gradient: "from-lime-400/20 to-green-500/20",
    badge: "bg-lime-100 text-lime-700",
  },
];

const categories = ["Todos", "IA", "Mobile", "Web", "Open Source", "Saúde", "Educação", "Sustentável"];

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-black text-2xl text-primary tracking-tight">
            CapMar
          </Link>
          <div className="hidden md:flex items-center gap-2 bg-white/70 border border-black/5 rounded-xl px-3 py-2 w-72">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full" placeholder="Buscar projetos..." />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/feed" className="hidden md:block text-sm font-semibold text-gray-600 hover:text-primary transition-colors">
              Entrar
            </Link>
            <Link href="/feed" className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-10">
        <div className="text-center space-y-4 py-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded-full tracking-wide uppercase">
            Projetos universitários em destaque
          </span>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight">
            Descubra o que está sendo<br className="hidden md:block" /> construído nas universidades
          </h1>
          <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
            Conecte-se com equipes inovadoras, acompanhe projetos reais e faça parte da próxima geração de criadores.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
                i === 0
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {popularProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projeto/${project.id}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className={`h-32 bg-gradient-to-br ${project.gradient} flex items-end p-4`}>
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center font-heading font-black text-lg text-primary">
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{project.team} · {project.university}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl ${project.badge}`}>
                    {project.status}
                  </span>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                  {project.tagline}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-xl">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-1 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    {project.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {project.views}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {project.members} membros
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-white space-y-4">
          <h2 className="font-heading font-black text-3xl md:text-4xl">Tem um projeto? Mostre para o mundo.</h2>
          <p className="text-white/70 max-w-md mx-auto">
            Cadastre seu projeto, monte sua equipe e conecte-se com outros criadores da sua universidade.
          </p>
          <Link
            href="/feed"
            className="inline-block bg-white text-primary font-semibold text-sm px-8 py-3 rounded-xl hover:bg-white/90 transition-colors mt-2"
          >
            Criar minha conta grátis
          </Link>
        </div>
      </main>
    </div>
  );
}
