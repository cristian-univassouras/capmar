# Descobrir: baralho de projetos para o evento

## Objetivo
Dinâmica de teste da plataforma no evento: a pessoa escaneia um QR Code, cai em `/descobrir` e avalia projetos como num baralho (curtir/passar). Sem login. Tudo que ela faz é gravado para virar métrica dos objetivos do projeto.

## Decisões (confirmadas pelo time)
- Entram no baralho **todos os projetos públicos** que não são rascunho, em ordem embaralhada por pessoa.
- Visitante identificado por **ID anônimo por aparelho** (UUID no `localStorage`). Cada pessoa tem **um voto atual por projeto**, pode mudar, e **toda mudança fica registrada**.
- Ao acabar, **tela de fim com resumo da pessoa e ranking geral**, com convite para criar conta.
- Métricas em **aba "Descobrir" do admin** com **exportação CSV**, e **QR do evento** gerado ali.

## Interação
- Foto do projeto + nome embaixo.
- Arrastar para a **direita** = curtir; para a **esquerda** = passar.
- **Toque no centro** ou **rolar/arrastar para baixo (cima no toque)** abre os detalhes; dentro dos detalhes também há curtir/passar.
- Computador: mouse arrasta; setas ←/→ votam; ↓, Espaço ou Enter abrem detalhes; Esc fecha; botões visíveis para tudo.
- Desfazer o último voto.
- Respeita `prefers-reduced-motion` (sem voo do card; troca direta).

## O que é gravado (tabela `discover_events`, append-only)
Sessão (`discover_sessions`): aparelho (tipo, SO, navegador, idioma, tela, toque), origem do QR (`?e=`), referência, usuário logado se houver, IP só como hash, visitas.
Eventos: `session_start`, `deck_loaded`, `tutorial_dismiss`, `card_view`, `like`, `dislike` (com método swipe/botão/teclado/detalhes, tempo até decidir, posição), `drag_cancel`, `undo`, `details_open`, `details_close` (tempo aberto, rolagem), `project_link_click`, `deck_end`, `ranking_view`, `signup_click`, `page_hidden`, `page_visible`, `error`.
Votos atuais em `discover_votes` (um por pessoa e projeto, com contagem de mudanças).
Fila local com reenvio: se a rede cair, nada se perde; `client_event_id` torna o reenvio idempotente.

## API
Pública: `GET /discover/deck`, `POST /discover/events`, `GET /discover/ranking`.
Admin (MFA): `GET /admin/discover/metrics`, `GET /admin/discover/export?kind=events|votes|sessions|projects`.
Limite próprio: não passa pelo limite global por IP (rede do evento compartilha IP).

## Métricas (painel)
Pessoas (sessões únicas), com voto, votos totais, curtidas/passes e taxa de curtida, votos por pessoa, mudanças de voto, desfazer, conclusão do baralho, abandono, tempo de sessão e por card, abertura de detalhes e conversão (detalhes → curtida), cliques para a página do projeto e cadastro, funil, dispositivos, métodos de voto, atividade por hora e pico, ranking e tabela por projeto (visualizações, curtidas, passes, aprovação, detalhes, tempo médio), por origem do QR.
