export default function Features() {
  return (
    <section id="features" className="relative w-full py-20 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Purple */}
          <div className="bg-primary rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10">
              A rede social<br />exclusiva para<br />projetos incríveis
            </h3>
            {/* Project Mockup */}
            <div className="bg-white rounded-2xl p-4 w-3/4 max-w-[280px] shadow-xl relative z-10 self-center mt-8">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">✨</div>
                <span className="text-black font-semibold">Nova Ideia</span>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-purple-400 rounded-full border-4 border-white flex items-center justify-center text-white z-20">
                →
              </div>
              <div className="flex items-center gap-3 bg-black rounded-xl p-3 mt-2 ml-auto w-4/5 justify-end">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold">🚀</div>
                <span className="text-white font-semibold">Lançamento</span>
              </div>
            </div>
          </div>

          {/* Card 2: Navy */}
          <div className="bg-secondary rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10">
              Conquiste a<br />visibilidade<br />que você merece
            </h3>
            {/* Stats Mockup */}
            <div className="bg-white rounded-t-2xl p-4 w-full shadow-xl relative z-10 mt-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-xs">👁️</div>
                <span className="text-black font-semibold">Visualizações</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-black font-bold text-xl">14.2K Views</span>
                <span className="text-green-500 font-semibold text-sm">↑ 32% nesta semana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column (Empty Spacer) */}
        <div className="hidden lg:block px-4 py-12 lg:py-0">
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Card 3: Dark Green */}
          <div className="bg-tertiary rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10 w-4/5">
              Transforme alcance em engajamento real
            </h3>
            {/* Phone Top Mockup */}
            <div className="bg-white rounded-t-2xl p-4 w-4/5 shadow-xl relative z-10 self-center mt-8 rotate-[-5deg] translate-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-4 bg-gray-200 rounded-full"></div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                </div>
              </div>
              <div className="text-black font-bold text-3xl mb-1">8.4k Likes</div>
              <div className="text-green-500 font-semibold text-sm mb-6">+1.2k novos seguidores</div>
              <div className="flex justify-between px-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
                <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
                <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
                <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            {/* Decorative background element */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#A3E635] rounded-tl-full opacity-90 z-0"></div>
          </div>

          {/* Card 4: Orange */}
          <div className="bg-accent rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10 text-black">
              Atraia os<br />investidores<br />certos
            </h3>
            {/* Chart Area Mockup */}
            <div className="absolute bottom-0 left-0 w-full h-[50%] z-0">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-[#FF5500]">
                <path d="M0,100 L0,80 Q20,90 40,60 T70,40 L100,20 L100,100 Z" />
              </svg>
              {/* Plot points */}
              <div className="absolute bottom-[20%] left-[20%] w-3 h-3 bg-white rounded-full"></div>
              <div className="absolute bottom-[40%] left-[55%] w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
