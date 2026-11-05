---
name: CapMar
description: Vitrine dos projetos de Maricá, feita como uma parede de azulejo sobre papel areia.
colors:
  paper: "#f6f1e7"
  surface: "#fffdf8"
  surface-2: "#faf5ea"
  ink: "#14262e"
  ink-title: "#0e2f3c"
  muted: "#55666c"
  line: "#ddd3bf"
  line-soft: "#eae2d0"
  lagoon-cobalt: "#1b4fa8"
  lagoon-cobalt-strong: "#143c82"
  lagoon-cobalt-soft: "#e4ebf7"
  terracotta: "#c4492a"
  terracotta-strong: "#a43a1e"
  terracotta-soft: "#f8e6dd"
  teal: "#0e7c86"
  teal-soft: "#dcefef"
  sun: "#f2b33d"
  sun-soft: "#fbefcf"
  restinga: "#1f6b4a"
  restinga-soft: "#e0f0e7"
  danger: "#b3261e"
  danger-soft: "#fbe7e4"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.3
rounded:
  control: "12px"
  card: "16px"
  dialog: "20px"
  badge: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.lagoon-cobalt}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.lagoon-cobalt-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.lagoon-cobalt-strong}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "46px"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.badge}"
---

# Design System: CapMar

## Overview

**Creative North Star: "Azulejo da Lagoa."** O CapMar é a vitrine de uma cidade pequena e específica. A interface lembra uma parede de azulejo bem cuidada sobre papel areia: calma, humana, com cor de verdade, e longe do SaaS roxo genérico que ela substituiu. O azulejo é a **textura de Maricá** e aparece em capas de projeto sem imagem, na faixa que separa seções públicas, no fundo do banner de perfil e na logo. Nunca vira moldura de conteúdo nem decoração de fundo de tela de trabalho.

O app logado (Operate) é sóbrio: papel, tinta e um cobalto de ação. A landing (Persuade) usa mais cor e a capivara. A voz é humana, em português do Brasil, sem jargão de investimento.

## Colors

Estratégia **Full palette** com papel como base: neutros tingidos (areia e azul-petróleo) e quatro cores de azulejo com papéis fixos.

- **Cobalto da lagoa** (`#1b4fa8`): ação principal, links, foco, item ativo da navegação. Uma ação principal por tela.
- **Terracota** (`#c4492a`): destaque e chamadas secundárias fortes; texto usa `terracotta-strong`. **Nunca indica erro.**
- **Teal** (`#0e7c86`) e **sol** (`#f2b33d`): só em azulejos, marcações e pequenos destaques.
- **Restinga** (`#1f6b4a`): sucesso e "público".
- **Perigo** (`#b3261e`): erro, exclusão, suspensão. Sempre acompanhado de texto e ícone.
- Texto: tinta `#14262e`, apoio `#55666c` (4.5:1 sobre o papel). Cinzas do Tailwind foram remapeados para neutros tingidos; `gray-400` já passa em 4.5:1.

## Typography

- **Bricolage Grotesque** para títulos (peso 700–800, tracking até −0.03em). **Figtree** para texto e controles.
- Texto mínimo de **13px**; corpo 15–16px; medida de leitura 65–75ch; títulos com `text-wrap: balance`.
- Sem caixa-alta corrida e sem eyebrow acima de título. Números de tabela com `tabular-nums`.

## Layout

- App: sidebar fixa de 248px (desktop) e barra inferior de 5 itens (celular); conteúdo até 1400px com respiro de 36px.
- Público: um único cabeçalho com logo, quatro links, Entrar e Criar conta, e rodapé com faixa de azulejo.
- Espaçamento em múltiplos de 4; mais espaço acima do título do que abaixo; grupos pequenos e respiro grande entre blocos.
- Alvos de toque de pelo menos 44px. Projeto: capa, título, uma linha de meta, uma ação principal de apoio ou contato, abas Materiais, Comentários e Equipe.

## Elevation & Depth

Plano, em camadas tonais: papel, superfície clara, borda de 1px (`line`). Elevação é **borda ou sombra, nunca as duas**. Sombra só em diálogos, toasts, menus e no hover do cartão de projeto, com deslocamento e desfoque suaves.

## Shapes

Cartões 16px, controles 12px, diálogos 20px, selos 8px. Pílula só em controles pequenos. Azulejos são módulos de 56px feitos de CSS (círculos, losangos, diagonais) com 2 a 3 cores da paleta.

## Components

- **Botão** (`ui-button`): 44px, variantes primário, secundário, accent, quieto e perigo; estados hover, active (afunda 1px), foco, carregando e concluído (check).
- **Campo** (`ui-field`): rótulo acima, ajuda e erro abaixo; erro com `--danger`, texto e shake curto.
- **Cartão de projeto**: capa (imagem ou `TileCover` por categoria), título, selo de status, até 3 tags; sobe 3px no hover.
- **Diálogo** (`ui-dialog`) e **confirmação** (`useConfirm`): substituem `window.confirm`; entrada por opacidade e translação.
- **Toast** (`useToast`): sucesso e erro, sem roubar foco, `role=status`.
- **Skeleton, estado vazio com a capivara, abas com indicador deslizante, menu Gerenciar do dono.**

## Motion

Um momento autoral por tela, com `cubic-bezier(.16,1,.3,1)` e 140–420ms. Só `transform`, `opacity`, `clip-path` e filtros leves. Entradas de lista em sequência (`stagger`), reveal por seção na landing, `pop` ao curtir, `number-in` em contadores, shake em erro, check em sucesso, accordion nos `<details>`. `prefers-reduced-motion` zera tudo.

## Do's and Don'ts

**Faça:** uma ação principal por tela; erro com texto, ícone e caminho de recuperação; capa de azulejo quando não há imagem; confirmar toda exclusão; toast em toda gravação.
**Não faça:** gradiente em texto, vidro decorativo, borda lateral colorida, sombra dura deslocada, eyebrow, cartões idênticos de ícone+título+texto como estrutura, terracota como erro, texto abaixo de 13px, números ou depoimentos inventados, azulejo como fundo de tela de trabalho.
