export default function ColorfulHero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center py-32 overflow-hidden bg-[#FF9B82]">
      
      {/* 3D Colorful Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
         {/* Fake 3D shapes */}
         <div className="absolute top-[10%] left-[10%] w-[40vw] h-[60vh] bg-[#3B82F6] rounded-full blur-xl opacity-80 mix-blend-multiply"></div>
         <div className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vh] bg-[#D946EF] rounded-full blur-xl opacity-80 mix-blend-multiply"></div>
         <div className="absolute top-[30%] right-[30%] w-[30vw] h-[30vw] bg-[#10B981] rounded-3xl rotate-45 blur-lg opacity-70 mix-blend-screen"></div>
         <div className="absolute bottom-[20%] left-[20%] w-[20vw] h-[40vh] bg-[#FBBF24] rounded-full blur-2xl opacity-90 mix-blend-overlay"></div>
      </div>

      {/* Massive 3D Text Overlapping */}
      <div className="relative z-10 w-full text-center pointer-events-none px-4">
        <h2 className="font-heading font-black text-[14vw] leading-[0.85] tracking-tighter text-white uppercase mx-auto transform scale-y-[1.1] text-shadow-solid">
          APROVEITE<br />MAIS O<br />MUNDO<br />CRIPTO
        </h2>
      </div>

      {/* Fox Placeholder (Center Overlapping) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[-80%] w-[250px] h-[200px] z-20">
        <div className="w-full h-full relative">
          <div className="absolute bottom-0 w-0 h-0 border-l-125 border-r-125 border-b-150 border-transparent border-b-[#E2761B]"></div>
          <div className="absolute bottom-0 left-[125px] w-0 h-0 border-l-62 border-r-62 border-b-125 border-transparent border-b-[#F6851B]"></div>
          <div className="absolute bottom-[62px] left-[93px] w-0 h-0 border-l-31 border-r-31 border-t-62 border-transparent border-t-[#C55307]"></div>
        </div>
      </div>

    </section>
  );
}
