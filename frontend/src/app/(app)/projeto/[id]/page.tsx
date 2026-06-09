const updates = [
  { user: "Ana Souza", text: "Finalizamos o módulo de análise de dados. Próximo passo: integração com a API de mapas.", time: "1d", likes: 12 },
  { user: "Pedro Lima", text: "Design das telas principais aprovado pelo cliente. Começando o desenvolvimento amanhã!", time: "3d", likes: 24 },
  { user: "Maria Costa", text: "Publicamos a documentação técnica no repositório. Link nos recursos do projeto.", time: "1sem", likes: 8 },
];

const members = [
  { name: "Ana Souza", role: "Líder / Dev Backend" },
  { name: "Pedro Lima", role: "Dev Frontend" },
  { name: "Maria Costa", role: "UX Designer" },
  { name: "Carlos Neto", role: "Data Scientist" },
];

export default function ProjetoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-secondary to-primary" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-secondary font-black text-xl font-heading shrink-0">
              EP
            </div>
            <div className="flex gap-2">
              <button className="border border-primary text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
                Seguir
              </button>
              <button className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                Participar
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="font-heading font-black text-2xl text-foreground">EcoTrack</h1>
              <p className="text-gray-500 text-sm mt-0.5">Monitoramento de pegada de carbono individual · Vassouras, RJ</p>
            </div>
            <span className="shrink-0 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-xl">
              Em Desenvolvimento
            </span>
          </div>

          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            Aplicativo mobile que permite aos usuários monitorar e reduzir sua pegada de carbono no dia a dia. Utilizamos IA para sugerir alternativas sustentáveis baseadas no comportamento do usuário.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {["IA", "Sustentabilidade", "Mobile", "React Native", "Python"].map((t) => (
              <span key={t} className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-xl">{t}</span>
            ))}
          </div>

          <div className="flex gap-6 mt-5">
            {[{ label: "Membros", value: "4" }, { label: "Seguidores", value: "87" }, { label: "Visualizações", value: "1.2k" }].map((s) => (
              <div key={s.label}>
                <p className="font-heading font-black text-xl text-foreground">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Atualizações */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-heading font-bold text-lg text-foreground">Atualizações</h2>
          {updates.map((u, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {u.user[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{u.user}</p>
                  <p className="text-xs text-gray-400">{u.time}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{u.text}</p>
              <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {u.likes}
                </button>
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Comentar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Membros */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground">Equipe</h3>
            {members.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recursos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-heading font-bold text-base text-foreground">Recursos</h3>
            {[
              { label: "Repositório GitHub", icon: "🔗" },
              { label: "Figma — Protótipo", icon: "🎨" },
              { label: "Documentação Técnica", icon: "📄" },
            ].map((r) => (
              <button key={r.label} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <span>{r.icon}</span> {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
