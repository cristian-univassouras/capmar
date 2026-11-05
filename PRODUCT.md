# Product

<!-- impeccable:product-schema 1 -->

> Nota de origem (2026-11-05): escrito sem entrevista, porque a pessoa responsável pelo projeto não estava disponível. Os fatos vêm do README, do `CLAUDE.md`, do código e das notas do vault. Itens marcados como **[inferido]** precisam de confirmação da equipe.

## Platform

web

## Users
- **Empreendedores e criadores de projetos de Maricá (RJ)**: pequenos e médios projetistas, microempreendedores, estudantes e coletivos que têm uma ideia ou negócio e pouca visibilidade. Usam o produto, muitas vezes pelo celular, para apresentar o projeto, formar equipe e receber contato. **[inferido]** Nem todos têm experiência com plataformas de investimento.
- **Investidores e apoiadores locais** (comerciantes, profissionais, pessoas da comunidade): querem conhecer projetos da cidade, avaliar rapidamente quem está por trás e entrar em contato ou apoiar. **[inferido]** Visitam sem conta e decidem em poucos minutos.
- **Administradores/moderadores** da plataforma: acompanham usuários, publicações e a trilha de auditoria.

## Product Purpose
CapMar é uma plataforma web que aumenta a visibilidade de pequenos e médios projetistas e microempreendedores de Maricá, conectando seus projetos a potenciais investidores e apoiadores locais. É o trabalho da disciplina Práticas Extensionistas Integradoras (6º período, Engenharia de Software, Universidade de Vassouras, campus Maricá), mas deve funcionar como produto real para a comunidade. Sucesso: projetos de Maricá encontrados, entendidos e contatados; equipes formadas; conversa e apoio acontecendo dentro da plataforma.

## Positioning
Vitrine local feita para Maricá: o foco é a cidade e as pessoas dela, não um marketplace genérico de investimento. Projetos têm apresentação própria (portfólio, materiais, vídeos, equipe, apoio), perfis públicos por @usuário e conversa direta entre quem cria e quem apoia. **[inferido]** O diferencial é a proximidade: todo projeto é de alguém da cidade.

## Operating Context
- Cadastro e login com e-mail e senha; administradores usam autenticação em duas etapas (MFA).
- Visitantes sem conta veem projetos públicos, busca, categorias e perfis; contas criam projetos e publicações, curtem, comentam, formam equipes e trocam mensagens (diretas e de equipe).
- Imagens e PDFs são enviados à plataforma; vídeos entram por YouTube/Vimeo; projetos têm QR Code e compartilhamento.
- Idioma único: português do Brasil. Uso frequente em celular.
- Painel administrativo com usuários, publicações e auditoria.

## Capabilities and Constraints
- Frontend Next.js 16 / React 19 / Tailwind v4 / Framer Motion v12; backend FastAPI + PostgreSQL 16; rotas públicas: `/`, `/home`, `/sobre`, `/ajuda`, `/login`, `/register`, `/projeto/[id]`, `/usuario/[id]`; área logada: `/feed`, `/projetos`, `/equipes`, `/equipe/[id]`, `/perfil`, `/chat`, `/seguranca`, `/admin`.
- Não há fluxo de pagamento ou investimento dentro da plataforma; o apoio é um link externo (`funding_url`) e o contato é por mensagem. **Decisão em aberto:** se o investidor terá área própria.
- Equipe segundo o README: backend Felipe Sodré, Andrey Violante e Thiago Calvet; frontend Cristian Barboza e Endriel Almeida.
- Prazo acadêmico anotado: 2026-11-27, a reconfirmar com orientador.
- A pasta do frontend segue Spec-Driven Development (`frontend/sdd/`).

## Brand Commitments
- Nome: **CapMar**. Mascote: a capivara (imagens em `frontend/public/`). Voz em português do Brasil, humana e local ("Feito em Maricá, para Maricá").
- Cores atuais da marca no código (`--primary #421C77`, `--accent #FF6B35`, `--secondary #100A55`, `--background #FFF1EB`) e as fontes Inter/Outfit **não** foram declaradas compromisso inegociável pela equipe; a identidade visual será redefinida no redesign. Permanecem o nome, a capivara e a voz.

## Evidence on Hand
- Projetos, equipes, posts e usuários de demonstração apenas no banco local de desenvolvimento (dados sintéticos).
- Imagens da capivara em `frontend/public/`.
- Não existem depoimentos reais, números de tração, parceiros confirmados nem logos de clientes: **não inventar**. Qualquer prova social na landing deve vir de projetos reais cadastrados ou ser rotulada como demonstração.

## Product Principles
1. **Maricá antes de tudo**: a cidade, as pessoas e os lugares são o diferencial; a interface não deve parecer de qualquer SaaS.
2. **O projeto é o protagonista**: a página de um projeto é onde o apoio acontece, então deve apresentar a ideia e levar a uma ação clara de contato ou apoio.
3. **Confiança antes de conversão**: quem apoia precisa ver quem faz, o que já existe e como falar com a pessoa; sem promessas que a plataforma não cumpre.
4. **Acessível a quem não é técnico**: linguagem simples, passos curtos, bom no celular e com baixa conexão.
5. **Feedback em toda ação**: carregar, salvar, errar e concluir precisam de resposta visível e calma.

## Accessibility & Inclusion
- Meta: WCAG 2.2 AA (contraste mínimo 4,5:1, alvos de toque de pelo menos 44px, foco visível, `prefers-reduced-motion` respeitado também nas animações em JavaScript). **[inferido]**
- Público com níveis variados de familiaridade digital; português simples; uso em celular de entrada.
