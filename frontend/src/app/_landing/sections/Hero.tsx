import Link from "next/link";
import InteractiveGrid from "@/app/_landing/components/InteractiveGrid";

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center pt-32 overflow-hidden bg-linear-to-b from-white to-background">
      {/* InteractiveGrid Background */}
      <InteractiveGrid />

      {/* Massive Text Background */}
      <div className="relative w-full max-w-[1400px] px-4 flex flex-col items-center justify-center text-center z-30 pointer-events-none">
        <h1 className="font-heading font-black text-[clamp(2rem,8vw,5.5rem)] leading-[0.8] tracking-tighter text-primary uppercase text-center mx-auto mb-12 transform scale-y-[1.1] pointer-events-auto">
          A vitrine <br /> do seu Projeto
        </h1>
        
        <Link
          href="/start"
          className="group relative overflow-hidden bg-black border border-black px-4 py-2 rounded-full text-lg font-bold transition-all duration-300 hover:bg-white hover:scale-105 pointer-events-auto"
        >
          <div className="relative flex items-center justify-center">
            <span className="text-white transition-transform duration-300 ease-in-out group-hover:translate-y-[-150%]">
              COMECE JÁ
            </span>
            <span className="absolute text-black transition-transform duration-300 ease-in-out translate-y-[150%] group-hover:translate-y-0">
              COMECE JÁ
            </span>
          </div>
        </Link>
      </div>


    </section>
  );
}
