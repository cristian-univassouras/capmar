import Navbar from "@/app/_landing/layout/Navbar";
import Footer from "@/app/_landing/layout/Footer";
import { Mail, ExternalLink } from "lucide-react";

const devs = [
  {
    name: "Cristian Barboza",
    role: "Frontend",
    email: "cristianbsconcurso@gmail.com",
    linkedin: "https://linkedin.com/in/cristian-barboza",
  },
  {
    name: "Endriel Medeiros",
    role: "Frontend",
    email: "endriel.medeiros@gmail.com",
    linkedin: "https://linkedin.com/in/endriel-medeiros",
  },
  {
    name: "Felipe Sodré",
    role: "Backend",
    email: "felipe.sodre@gmail.com",
    linkedin: "https://linkedin.com/in/felipe-sodre",
  },
  {
    name: "Andrey Violante",
    role: "Backend",
    email: "andrey.violante@gmail.com",
    linkedin: "https://linkedin.com/in/andrey-violante",
  },
];

export default function AjudaPage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-40 pb-24 flex flex-col items-center gap-20">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading font-black text-5xl md:text-7xl uppercase tracking-tighter text-primary leading-none mb-6">
            Precisando<br />de ajuda?
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Estamos aqui para ajudar. Entre em contato pelo e-mail da equipe ou fale diretamente com um dos nossos desenvolvedores.
          </p>
        </div>

        {/* Email da equipe */}
        <div className="w-full bg-primary rounded-[40px] p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-1">E-mail da equipe</p>
            <p className="font-heading font-black text-2xl md:text-3xl">capmar.dev@gmail.com</p>
          </div>
          <a
            href="mailto:capmar.dev@gmail.com"
            className="group relative overflow-hidden bg-white border border-white px-8 py-4 rounded-full font-bold text-primary transition-all duration-700 hover:bg-primary hover:border-white/40 shrink-0 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <div className="relative flex items-center justify-center overflow-hidden h-5">
              <span className="block transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-150%]">
                Nos mande um e-mail
              </span>
              <span className="absolute block text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[150%] group-hover:translate-y-0">
                Nos mande um e-mail
              </span>
            </div>
          </a>
        </div>

        {/* Devs */}
        <div className="w-full">
          <p className="text-center text-gray-400 text-sm font-semibold uppercase tracking-widest mb-8">
            Fale com os desenvolvedores
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {devs.map((dev) => (
              <div
                key={dev.name}
                className="bg-white rounded-[32px] p-7 flex flex-col gap-4 border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-black text-lg shrink-0">
                    {dev.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dev.name}</p>
                    <p className="text-sm text-gray-400">{dev.role}</p>
                  </div>
                </div>

                {/* Links */}
                <div className="flex flex-col gap-2 pl-16">
                  <a
                    href={`mailto:${dev.email}`}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    {dev.email}
                  </a>
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    {dev.linkedin.replace("https://", "")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <Footer />
    </main>
  );
}
