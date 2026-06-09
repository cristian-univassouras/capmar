const posts = [
  {
    user: "Ana Souza",
    handle: "@ana.souza",
    time: "2h",
    content: "Acabamos de lançar a versão beta do EcoTrack! Um app para monitorar a pegada de carbono individual. Muito orgulho dessa equipe incrível 🌱",
    project: "EcoTrack",
    likes: 42,
    comments: 8,
  },
  {
    user: "Pedro Lima",
    handle: "@pedro.lima",
    time: "5h",
    content: "Nossa equipe DevSquad está selecionando novos membros para o segundo semestre. Procuramos devs frontend com experiência em React/Next.js. Interessados, entrem em contato!",
    project: null,
    likes: 89,
    comments: 23,
  },
  {
    user: "Maria Costa",
    handle: "@maria.costa",
    time: "1d",
    content: "Apresentamos o FinHelp no hackathon universitário e ficamos em 2º lugar 🎉 Obrigada a todos que acreditaram no projeto desde o início.",
    project: "FinHelp",
    likes: 134,
    comments: 31,
  },
];

export default function FeedPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Criar post */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          U
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
            Compartilhe uma atualização do seu projeto...
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Imagem
            </button>
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Projeto
            </button>
            <button className="ml-auto bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
              Publicar
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Tudo", "Projetos", "Equipes", "Pessoas", "Eventos"].map((f, i) => (
          <button
            key={f}
            className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
              i === 0
                ? "bg-primary text-white"
                : "bg-white text-gray-500 border border-gray-100 hover:border-primary/30 hover:text-primary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Posts */}
      {posts.map((post, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {post.user[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800">{post.user}</p>
              <p className="text-xs text-gray-400">{post.handle} · {post.time}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
            </button>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>

          {post.project && (
            <div className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium">Projeto</p>
                <p className="font-semibold text-sm text-primary">{post.project}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1 border-t border-gray-50">
            <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              {post.likes}
            </button>
            <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {post.comments}
            </button>
            <button className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Compartilhar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
