import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="w-full py-40 flex flex-col items-center justify-center bg-transparent text-center px-4 relative z-20">
      <h2 className="font-heading font-black text-6xl md:text-8xl lg:text-[80px] uppercase tracking-tighter text-primary mb-12">
        Comece Agora
      </h2>
      <Link
        href="/register"
        className="group relative overflow-hidden bg-primary border border-primary px-12 py-6 rounded-full text-2xl font-bold transition-all duration-700 hover:bg-white shadow-xl"
      >
        <div className="relative flex items-center justify-center">
          <span className="text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-150%]">
            Criar conta
          </span>
          <span className="absolute text-primary transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[150%] group-hover:translate-y-0">
            Criar conta
          </span>
        </div>
      </Link>
    </section>
  );
}
