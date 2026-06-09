export default function Web3Grid() {
  return (
    <section className="relative w-full py-20 px-4 md:px-8 max-w-[1600px] mx-auto bg-[#E8F8CE]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Navy */}
          <div className="bg-[#0F0A3C] rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10 w-4/5">
              Conecte-se a dapps de cripto
            </h3>
            {/* Connect Wallet Mockup */}
            <div className="bg-white rounded-full p-4 w-4/5 shadow-xl relative z-10 self-center mt-auto flex items-center justify-center gap-4 border-b-8 border-purple-800">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs">🌐</div>
              <span className="text-black font-bold text-sm">CONECTAR CARTEIRA</span>
            </div>
          </div>

          {/* Card 2: Lavender */}
          <div className="bg-[#E9D5FF] rounded-[40px] p-8 text-[#4C1D95] relative overflow-hidden flex flex-col justify-between aspect-square lg:aspect-auto lg:h-[400px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10">
              As melhores taxas, milhares de serviços agregados
            </h3>
            {/* Circular Icons Mockup */}
            <div className="absolute bottom-8 left-8 flex items-center justify-center z-10">
              <div className="w-16 h-16 bg-white rounded-full absolute -left-4 shadow-lg"></div>
              <div className="w-16 h-16 bg-[#93C5FD] rounded-full absolute left-16 shadow-lg flex items-center justify-center text-white">$</div>
              <div className="w-24 h-24 bg-[#312E81] rounded-full relative z-20 flex items-center justify-center shadow-xl text-white text-2xl border-4 border-[#E9D5FF]">
                🗂
              </div>
              <div className="w-12 h-12 bg-[#D8B4FE] rounded-full absolute -bottom-4 left-4 shadow-lg flex items-center justify-center text-white">$</div>
            </div>
          </div>
        </div>

        {/* Center Column: Giant Text & Fox */}
        <div className="flex flex-col items-center justify-center text-center px-4 py-12 lg:py-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[600px] bg-white rounded-[40px] opacity-40 z-0 hidden lg:block"></div>
          <h2 className="font-heading font-black text-[10vw] lg:text-[5vw] leading-[0.8] tracking-tighter text-[#064E3B] uppercase transform scale-y-[1.1] mb-12 z-10">
            APROVEITE<br />MAIS O<br />MUNDO<br />CRIPTO
          </h2>
          <div className="w-48 h-48 relative mt-8 z-10">
            <div className="absolute bottom-0 w-0 h-0 border-l-96 border-r-96 border-b-120 border-transparent border-b-[#E2761B]"></div>
            <div className="absolute bottom-0 left-[96px] w-0 h-0 border-l-48 border-r-48 border-b-96 border-transparent border-b-[#F6851B]"></div>
            <div className="absolute bottom-[48px] left-[72px] w-0 h-0 border-l-24 border-r-24 border-t-48 border-transparent border-t-[#C55307]"></div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Card 3: Dark Green */}
          <div className="bg-[#064E3B] rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between aspect-square lg:auto lg:h-[450px]">
            <h3 className="text-3xl lg:text-4xl font-medium leading-tight z-10 w-4/5">
              Colecione e negocie NFTs
            </h3>
            {/* Fake NFTs Mockup */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] z-10 flex">
                <div className="w-full h-full bg-purple-500 rounded-t-xl rotate-[-10deg] border-4 border-[#064E3B] relative overflow-hidden">
                    <div className="absolute top-2 right-2 bg-black text-xs px-2 py-1 rounded">SOLD</div>
                    <div className="absolute bottom-0 left-0 w-full h-[60%] bg-pink-400"></div>
                </div>
                <div className="w-[80%] h-full bg-blue-400 rounded-t-xl absolute right-[-10%] rotate-15 border-4 border-[#064E3B] z-[-1] overflow-hidden">
                    <div className="absolute top-2 right-2 bg-white text-black text-xs px-2 py-1 rounded">LISTED</div>
                </div>
            </div>
          </div>

          {/* Card 4: Orange */}
          <div className="bg-[#FF8A4C] rounded-[40px] p-8 text-[#5C2D11] relative overflow-hidden flex flex-col justify-between aspect-square lg:auto lg:h-[350px]">
            <h3 className="text-3xl lg:text-3xl font-medium leading-tight z-10 w-4/5">
              Privacidade em 1º lugar: você define os termos para seus dados
            </h3>
            {/* Input field Mockup */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#FF5500] rounded-tl-[100px] z-0"></div>
            <div className="bg-white rounded-lg p-4 w-full shadow-xl relative z-10 mt-auto flex items-center gap-4">
              <span className="text-xl">🔒</span>
              <div className="h-6 w-px bg-gray-300"></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
