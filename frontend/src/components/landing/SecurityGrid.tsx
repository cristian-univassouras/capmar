export default function SecurityGrid() {
  return (
    <section className="relative w-full min-h-screen flex items-center py-20 px-4 md:px-8 max-w-[1600px] mx-auto pointer-events-none mt-[-100vh] z-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)] w-full pointer-events-auto">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Lime Green */}
          <div className="bg-[#D9F99D] rounded-[40px] p-8 text-black relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10 w-4/5">
              Conecte-se com visionários e construa a sua tribo
            </h3>
            {/* Fake 3D Avatars Mockup */}
            <div className="absolute bottom-0 left-0 w-full h-[50%] bg-[#BEF264] rounded-tr-[80px] z-0 flex items-end justify-center p-4 gap-2">
               <div className="w-12 h-12 bg-blue-600 rounded-full border-4 border-[#D9F99D]"></div>
               <div className="w-16 h-16 bg-pink-500 rounded-full border-4 border-[#D9F99D]"></div>
               <div className="w-12 h-12 bg-purple-600 rounded-full border-4 border-[#D9F99D]"></div>
               <div className="w-10 h-10 bg-orange-500 rounded-full border-4 border-[#D9F99D]"></div>
            </div>
          </div>

          {/* Card 2: Light Blue */}
          <div className="bg-[#BFDBFE] rounded-[40px] p-8 text-black relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10">
              Valide suas ideias e receba feedbacks valiosos
            </h3>
            {/* Notification Mockup */}
            <div className="absolute bottom-[-20%] right-[-10%] w-[120%] h-[60%] bg-[#93C5FD] rotate-[-10deg] z-0"></div>
            <div className="bg-white rounded-2xl p-4 w-4/5 shadow-xl relative z-10 self-center mt-auto flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <span className="text-sm font-semibold">0x8dA6 •••• 6045</span>
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#312E81] rounded-full flex items-center justify-center text-white">🔒</div>
            </div>
          </div>
        </div>

        {/* Center Column: Reserved for animated phone entering from CapmarShowcase */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center px-4 py-12 lg:py-0 min-h-[600px] pointer-events-none">
          {/* Empty space where the shrunken CapmarShowcase will land */}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Card 3: Lavender */}
          <div className="bg-[#E9D5FF] rounded-[40px] p-8 text-primary relative overflow-hidden flex flex-col justify-between aspect-square lg:auto lg:h-[350px]">
            <h3 className="text-3xl lg:text-3xl font-medium leading-tight z-10">
              Networking autêntico: converse direto com quem apoia sua visão
            </h3>
            {/* Chat Mockup */}
            <div className="flex flex-col gap-4 mt-6 z-10">
              <div className="bg-white/40 rounded-2xl rounded-bl-sm p-4 w-4/5">
                <div className="w-1/2 h-3 bg-purple-300 rounded-full"></div>
              </div>
              <div className="bg-[#4C1D95] rounded-2xl rounded-br-sm p-4 w-4/5 self-end flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-xs">👤</div>
                <div className="w-1/2 h-3 bg-purple-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Card 4: Navy */}
          <div className="bg-[#1E1B4B] rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:auto lg:h-[450px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10">
              A vitrine global onde os grandes projetos decolam
            </h3>
            {/* Wireframe Globe */}
            <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 border border-[#4C1D95] rounded-full flex items-center justify-center opacity-50">
                <div className="w-48 h-64 border border-[#4C1D95] rounded-full"></div>
                <div className="absolute w-64 h-48 border border-[#4C1D95] rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
