import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="w-full py-40 flex flex-col items-center justify-center bg-transparent text-center px-4 relative z-20">
      <h2 className="font-heading font-black text-6xl md:text-8xl lg:text-[130px] uppercase tracking-tighter text-primary mb-12">
        Comece Agora
      </h2>
      <Link
        href="/register"
        className="bg-primary text-white px-12 py-6 rounded-full text-2xl font-bold hover:bg-secondary transition-transform hover:scale-105 shadow-xl"
      >
        Criar conta
      </Link>
    </section>
  );
}
