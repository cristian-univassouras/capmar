import PublicFrame from "@/app/_components/PublicFrame";
import Link from "next/link";

import { Mail, ExternalLink, ChevronDown, ArrowRight } from "lucide-react";

const devs = [
  { name: "Cristian Barboza", role: "Frontend", email: "cristianbsconcurso@gmail.com", linkedin: "https://linkedin.com/in/cristian-barboza" },
  { name: "Endriel Medeiros", role: "Frontend", email: "endriel.medeiros@gmail.com", linkedin: "https://linkedin.com/in/endriel-medeiros" },
  { name: "Felipe Sodré", role: "Backend", email: "felipe.sodre@gmail.com", linkedin: "https://linkedin.com/in/felipe-sodre" },
  { name: "Andrey Violante", role: "Backend", email: "andrey.violante@gmail.com", linkedin: "https://linkedin.com/in/andrey-violante" },
];

const questions=[
 ["Como cadastro meu projeto?","Entre na sua conta e abra Projetos → Novo projeto. Preencha o nome e as informações básicas. Você pode adicionar imagens, materiais e parceiros agora ou editar mais tarde."],
 ["Quem pode ver meu projeto?","Projetos públicos aparecem na vitrine e podem ser compartilhados por link ou QR Code. Projetos privados ficam disponíveis apenas para pessoas autorizadas. A visibilidade pode ser alterada ao editar o projeto."],
 ["Quais materiais posso enviar?","Imagens e PDFs de até 5 MB. PDFs devem estar sem senha e ter até 50 páginas. Para vídeos, adicione um link do YouTube ou Vimeo. Depois do envio, clique em Adicionar material e salve o projeto."],
 ["Como começo uma conversa?","Abra Mensagens e escolha Nova mensagem para encontrar uma pessoa. Você também pode usar Enviar mensagem no perfil dela. As conversas das equipes aparecem para seus integrantes."],
 ["Como recupero minha senha?","Na tela de entrada, escolha Esqueci minha senha. O link enviado por e-mail vale por 30 minutos e pode ser usado uma vez. Um novo pedido substitui o link anterior. Se você usa autenticador, o código continua sendo necessário."],
 ["Perdi o acesso ao autenticador. O que faço?","Entre em contato com a equipe pelo canal abaixo. A recuperação exige verificação da identidade; não envie sua senha ou códigos de acesso por e-mail."],
];

const quick = [
  { title: "Cadastrar meu projeto", href: "/projetos" },
  { title: "Ver minhas conversas", href: "/chat" },
  { title: "Recuperar minha senha", href: "/esqueci-senha" },
];

export default function AjudaPage(){
  return <PublicFrame className="max-w-3xl">
    <div className="ui-page-heading"><div><h1>Como podemos ajudar?</h1><p>Respostas curtas para os primeiros passos na comunidade.</p></div></div>

    <nav aria-label="Atalhos de ajuda" className="flex flex-wrap gap-3">
      {quick.map(({title,href})=><Link key={href} href={href} className="ui-button">{title}<ArrowRight size={16} aria-hidden="true"/></Link>)}
    </nav>

    <section aria-labelledby="perguntas" className="py-2">
      <h2 id="perguntas" className="mb-5 font-heading text-2xl font-bold tracking-tight text-secondary">Perguntas frequentes</h2>
      <div className="ui-panel divide-y divide-line overflow-hidden">
        {questions.map(([q,a])=><details key={q} className="help-question"><summary>{q}<ChevronDown className="chev shrink-0" size={18} aria-hidden="true"/></summary><p>{a}</p></details>)}
      </div>
    </section>

    <aside className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-primary-soft p-6 sm:p-7">
      <div>
        <h2 className="font-heading text-xl font-bold text-secondary">Ainda precisa de uma mão?</h2>
        <p className="mt-2 text-[15px] text-gray-600">Escreva para a equipe do CapMar.</p>
        <p className="mt-1 break-all text-[15px] font-semibold text-primary-strong">capmar.dev@gmail.com</p>
      </div>
      <a href="mailto:capmar.dev@gmail.com" className="ui-button ui-button-primary"><Mail size={17} aria-hidden="true"/>Enviar e-mail</a>
    </aside>

    <details className="rounded-[16px] border border-line bg-surface">
      <summary className="flex min-h-[52px] items-center justify-between gap-3 px-5 text-[15px] font-semibold text-secondary">Equipe de desenvolvimento<ChevronDown className="chev shrink-0" size={18} aria-hidden="true"/></summary>
      <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2">
        {devs.map(dev=><div key={dev.name} className="rounded-[12px] border border-line-soft bg-surface-2 p-4">
          <h3 className="font-semibold text-secondary">{dev.name}</h3>
          <p className="text-sm text-muted">{dev.role}</p>
          <a href={"mailto:"+dev.email} className="mt-2 flex min-h-11 items-center gap-2 break-all text-sm text-gray-600 hover:text-primary"><Mail size={15} className="shrink-0" aria-hidden="true"/>{dev.email}</a>
          <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"><ExternalLink size={15} aria-hidden="true"/>LinkedIn<span className="sr-only"> de {dev.name}</span></a>
        </div>)}
      </div>
    </details>
  </PublicFrame>;
}
