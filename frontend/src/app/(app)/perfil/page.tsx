const skills = ["React", "Node.js", "UX Design", "Python", "Gestão de Projetos"];

const projects = [
  { name: "EcoTrack", desc: "Monitoramento de pegada de carbono", tags: ["IA", "Sustentável"], members: 4 },
  { name: "FinHelp", desc: "Educação financeira para jovens", tags: ["Fintech", "Educação"], members: 3 },
  { name: "UrbanAI", desc: "Análise de mobilidade urbana", tags: ["IA", "Cidade"], members: 5 },
];

export default function PerfilPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Capa + Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-primary to-secondary" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-primary font-black text-2xl font-heading">
              U
            </div>
            <button className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors">
              Editar Perfil
            </button>
          </div>

          <h1 className="font-heading font-black text-2xl text-foreground">Usuário Exemplo</h1>
          <p className="text-gray-500 text-sm mt-0.5">@usuario.exemplo · Vassouras, RJ</p>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            Estudante de Engenharia de Software apaixonado por tecnologia e inovação. Construindo projetos que geram impacto real.
          </p>

          <div className="flex gap-6 mt-5">
            {[
              { label: "Projetos", value: "3" },
              { label: "Equipes", value: "2" },
              { label: "Conexões", value: "48" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-heading font-black text-xl text-foreground">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {skills.map((skill) => (
              <span key={skill} className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-xl">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Projetos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-foreground">Projetos</h2>
          <button className="text-sm text-primary font-semibold hover:underline">Ver todos</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.name} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.members} membros</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{p.desc}</p>
              <div className="flex gap-1.5 flex-wrap">
                {p.tags.map((t) => (
                  <span key={t} className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-xl">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm font-semibold">Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Equipes */}
      <div className="space-y-3">
        <h2 className="font-heading font-bold text-lg text-foreground">Equipes</h2>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {[
            { name: "DevSquad", role: "Desenvolvedor Frontend", members: 6 },
            { name: "InovaLab", role: "Designer", members: 4 },
          ].map((team) => (
            <div key={team.name} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{team.name}</p>
                <p className="text-xs text-gray-400">{team.role} · {team.members} membros</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
