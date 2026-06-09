const members = [
  { name: "Ana Souza", role: "Líder", skills: ["React", "Node.js"], status: "Ativo" },
  { name: "Pedro Lima", role: "Dev Frontend", skills: ["Vue", "Figma"], status: "Ativo" },
  { name: "Maria Costa", role: "Designer", skills: ["Figma", "UX"], status: "Ativo" },
  { name: "Carlos Neto", role: "Backend", skills: ["Python", "AWS"], status: "Ativo" },
  { name: "Lucia Braga", role: "QA", skills: ["Testing", "Cypress"], status: "Ativo" },
  { name: "Rafael Torres", role: "Dev Mobile", skills: ["React Native"], status: "Ativo" },
];

const projects = [
  { name: "EcoTrack", status: "Em Desenvolvimento", members: 4, tags: ["IA", "Mobile"] },
  { name: "DataVis", status: "Concluído", members: 3, tags: ["Data", "Dashboard"] },
];

export default function EquipePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-accent/80 to-primary" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-accent font-black text-xl font-heading shrink-0">
              DS
            </div>
            <div className="flex gap-2">
              <button className="border border-primary text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
                Seguir
              </button>
              <button className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                Solicitar Entrada
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-heading font-black text-2xl text-foreground">DevSquad</h1>
              <p className="text-gray-500 text-sm mt-0.5">Universidade de Vassouras · Fundada em 2023</p>
            </div>
            <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl">
              Aberta para novos membros
            </span>
          </div>

          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            Equipe multidisciplinar focada em desenvolvimento de produtos digitais com impacto social. Reunimos devs, designers e gestores para criar soluções inovadoras.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {["Full-Stack", "Mobile", "IA", "Design", "Open Source"].map((t) => (
              <span key={t} className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-xl">{t}</span>
            ))}
          </div>

          <div className="flex gap-6 mt-5">
            {[{ label: "Membros", value: "6" }, { label: "Projetos", value: "2" }, { label: "Seguidores", value: "124" }].map((s) => (
              <div key={s.label}>
                <p className="font-heading font-black text-xl text-foreground">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Membros */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-foreground">Membros</h2>
            <span className="text-sm text-gray-400">6 ativos</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.name} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.role}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {m.skills.map((s) => (
                    <span key={s} className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Projetos da equipe */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground">Projetos</h3>
            {projects.map((p) => (
              <div key={p.name} className="space-y-2 cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 shrink-0 group-hover:bg-primary/10 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 group-hover:text-primary transition-colors truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.members} membros</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{t}</span>
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                    p.status === "Concluído" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Vagas abertas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-heading font-bold text-base text-foreground">Vagas Abertas</h3>
            {["Dev Mobile", "Designer UI"].map((vaga) => (
              <div key={vaga} className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{vaga}</p>
                <button className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1 rounded-xl hover:bg-primary hover:text-white transition-colors">
                  Candidatar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
