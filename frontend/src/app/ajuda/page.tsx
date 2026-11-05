import PublicFrame from "@/app/_components/PublicFrame";
import Link from "next/link";

import { Mail, ExternalLink, FolderKanban, MessagesSquare, KeyRound, ChevronDown } from "lucide-react";

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


const questions=[
 ["Como cadastro meu projeto?","Entre na sua conta e abra Projetos → Novo projeto. Preencha o nome e as informações básicas. Você pode adicionar imagens, materiais e parceiros agora ou editar mais tarde."],
 ["Quem pode ver meu projeto?","Projetos públicos aparecem na vitrine e podem ser compartilhados por link ou QR Code. Projetos privados ficam disponíveis apenas para pessoas autorizadas. A visibilidade pode ser alterada ao editar o projeto."],
 ["Quais materiais posso enviar?","Imagens e PDFs de até 5 MB. PDFs devem estar sem senha e ter até 50 páginas. Para vídeos, adicione um link do YouTube ou Vimeo. Depois do envio, clique em Adicionar material e salve o projeto."],
 ["Como começo uma conversa?","Abra Mensagens e escolha Nova mensagem para encontrar uma pessoa. Você também pode usar Enviar mensagem no perfil dela. As conversas das equipes aparecem para seus integrantes."],
 ["Como recupero minha senha?","Na tela de entrada, escolha Esqueci minha senha. O link enviado por e-mail vale por 30 minutos e pode ser usado uma vez. Um novo pedido substitui o link anterior. Se você usa autenticador, o código continua sendo necessário."],
 ["Perdi o acesso ao autenticador. O que faço?","Entre em contato com a equipe pelo canal abaixo. A recuperação exige verificação da identidade; não envie sua senha ou códigos de acesso por e-mail."],
];
export default function AjudaPage(){return <PublicFrame className="max-w-5xl"><div className="ui-page-heading"><div><p className="ui-eyebrow">Central de ajuda</p><h1 className="mt-3">Como podemos ajudar?</h1><p>Encontre orientação para os próximos passos na comunidade.</p></div></div><div className="grid gap-4 sm:grid-cols-3">{[{icon:FolderKanban,title:"Meu projeto",text:"Apresentação e materiais",href:"/projetos"},{icon:MessagesSquare,title:"Minhas conversas",text:"Pessoas e equipes",href:"/chat"},{icon:KeyRound,title:"Meu acesso",text:"Recuperar senha",href:"/esqueci-senha"}].map(({icon:Icon,title,text,href})=><Link href={href} key={title} className="ui-panel p-6 transition hover:border-primary/30"><Icon className="mb-5 text-primary" size={25}/><h2 className="font-heading text-lg font-bold text-secondary">{title}</h2><p className="mt-2 text-xs text-gray-500">{text} ↗</p></Link>)}</div><section className="py-4"><h2 className="mb-5 font-heading text-xl font-bold text-secondary">Respostas para o dia a dia</h2><div className="ui-panel divide-y divide-gray-100">{questions.map(([q,a])=><details key={q} className="help-question"><summary>{q}<ChevronDown size={17}/></summary><p>{a}</p></details>)}</div></section><aside className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-primary p-7 text-white"><div><h2 className="font-heading text-xl font-bold">Ainda precisa de uma mão?</h2><p className="mt-2 text-sm text-white/70">Fale com a equipe do CapMar pelo nosso e-mail.</p><p className="mt-1 break-all text-sm font-semibold">capmar.dev@gmail.com</p></div><a href="mailto:capmar.dev@gmail.com" className="ui-button bg-white text-primary"><Mail size={17}/>Enviar e-mail</a></aside><details className="py-4"><summary className="text-sm font-semibold text-gray-500">Equipe de desenvolvimento</summary><div className="mt-5 grid gap-4 sm:grid-cols-2">{devs.map(dev=><div key={dev.name} className="ui-panel p-5"><h3 className="font-semibold text-secondary">{dev.name}</h3><p className="mt-1 text-xs text-gray-400">{dev.role}</p><a href={"mailto:"+dev.email} className="mt-4 flex items-center gap-2 break-all text-xs text-gray-500"><Mail size={14} className="shrink-0"/>{dev.email}</a><a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 text-xs text-primary"><ExternalLink size={14}/>LinkedIn</a></div>)}</div></details></PublicFrame>;}
