# Fechamento das Pendências — Sprint 0 e Sprint 1

**Status:** Draft
**Data:** 09/09/2026
**Autor:** Cristian Barboza

---

## 1. Visão Geral

Esta especificação cobre as pendências identificadas ao comparar o **Backlog Inicial de Requisitos e Cronograma de Entregas** (`docs/CapMar_Backlog_Cronograma.pdf`) com o estado atual do repositório, considerando apenas o escopo do **Sprint 0 — Fundação** e do **Sprint 1 — MVP essencial** (10 a 23 de setembro de 2026).

Itens de infraestrutura/VPS (proxy reverso, SSL, backup, hardening de servidor) e itens documentais (diagramas, relatório acadêmico) foram deliberadamente **excluídos** deste documento e serão tratados em specs próprias. O **rate limiting** (US-028) também ficou de fora por decisão da equipe — depende do proxy reverso para identificar o IP real do cliente, então acompanha a spec de infraestrutura.

O que sobra são sete frentes de trabalho: quatro dívidas do Sprint 0 que atravessaram para o Sprint 1 (cookie HttpOnly, transações ACID, `SECRET_KEY`, GitFlow) e três entregas do próprio Sprint 1 (palavras-chave, busca, filtro por categoria), mais a validação de responsividade e do fluxo mobile.

O problema que isso resolve: hoje a plataforma tem CRUD de projetos funcionando, mas **não é possível encontrar um projeto** — não há busca nem filtro — e a sessão do usuário está exposta a XSS por guardar o JWT em `localStorage`.

---

## 2. Requisitos (User Stories / Casos de Uso)

Histórias herdadas do backlog original, com a prioridade e a sprint de origem.

### Dívidas do Sprint 0

- [ ] **US-026** (Alta) — **Como** time técnico, **eu quero** armazenar o token JWT em cookies HttpOnly e Secure, **para que** a aplicação fique protegida contra XSS e sequestro de sessão.
- [ ] **US-036** (Alta) — **Como** time técnico, **eu quero** garantir que operações entre Projetos, Usuários e Palavras-Chave rodem em transações ACID, **para que** não haja dados inconsistentes.
- [ ] **US-032** (Alta) — **Como** time de desenvolvimento, **eu quero** seguir o fluxo GitFlow com revisões via Pull Request, **para que** a branch de produção se mantenha estável.
- [ ] **CFG-01** (Alta, derivado) — **Como** time técnico, **eu quero** que a `SECRET_KEY` venha obrigatoriamente do ambiente, **para que** os JWTs não sejam assinados com o segredo padrão do código-fonte.

### Entregas do Sprint 1

- [ ] **US-010** (Alta) — **Como** time técnico, **eu quero** modelar a relação entre projetos e palavras-chave no banco de dados, **para que** as buscas inteligentes tenham sustentação.
- [ ] **US-007** (Alta) — **Como** visitante, **eu quero** buscar projetos por texto livre, **para que** eu encontre rapidamente conteúdos do meu interesse.
- [ ] **US-008** (Alta) — **Como** visitante, **eu quero** filtrar projetos por categoria, **para que** eu refine minha navegação.
- [ ] **US-023** (Alta) — **Como** visitante em dispositivo móvel, **eu quero** acessar rapidamente o perfil completo de um projeto, **para que** eu possa usá-lo como cartão de visitas digital.
- [ ] **US-024** (Alta) — **Como** usuário, **eu quero** navegar pela plataforma em desktop, tablet e smartphone com boa usabilidade, **para que** eu acesse o conteúdo em qualquer dispositivo.

**Fora de escopo desta spec:**
- **US-009** (UI de associação de tags pelo projetista) é Sprint 2. Aqui entregamos apenas a modelagem e a persistência que a sustentam.
- **US-028** (rate limiting em login e cadastro) foi adiada. A história continua no backlog do Sprint 1 e precisa ser reprogramada — ver *Pontos em aberto*, seção 6.

---

## 3. Design e Interface (UI/UX)

Nem todas as frentes têm interface. As que têm são: **busca e filtro** (US-007/US-008) e a **auditoria de responsividade** (US-023/US-024). As demais são backend ou processo.

### 3.1 Busca e filtro — página `/projetos`

**Estado inicial**
A página carrega como hoje (`listProjects()` + `listCategories()`), acrescida de uma barra de controles acima da grade:
- Campo de texto com ícone de lupa e placeholder "Buscar projetos...".
- `<select>` de categorias com a opção padrão "Todas as categorias".
- Botão "Limpar" visível apenas quando há algum filtro ativo.

Os valores iniciais vêm da querystring (`?q=&categoria=`), de modo que uma busca possa ser compartilhada por link e sobreviva ao refresh.

**Interações do usuário**
- Digitar no campo dispara a busca com **debounce de 300ms** — não há botão "Buscar".
- Trocar a categoria dispara a busca imediatamente.
- Cada disparo atualiza a URL via `router.replace` (sem empilhar histórico a cada tecla).
- "Limpar" zera os dois controles e volta à listagem completa.

**Estados de feedback**
- **Loading:** a grade é substituída por skeletons de card (mantendo a altura, sem "pulo" de layout). Buscas subsequentes usam um indicador discreto no campo em vez do skeleton completo, para não piscar a tela a cada tecla.
- **Success:** grade de projetos + contador "N projetos encontrados".
- **Empty:** ilustração/ícone + "Nenhum projeto encontrado para *&lt;termo&gt;*" + botão "Limpar filtros". Quando não há nenhum projeto na base (e nenhum filtro), manter a mensagem de vazio já existente.
- **Error:** mensagem de erro com botão "Tentar novamente", reaproveitando o padrão de `loadError` já usado na página.

### 3.2 Responsividade e fluxo mobile

**Breakpoints a validar:** 360px (mobile pequeno), 768px (limiar do `md:`), 1024px (tablet paisagem), 1440px (desktop).

O `AppShell` hoje troca sidebar por bottom nav num único ponto (`md:`, 768px) — `AppShell.tsx:50` e `AppShell.tsx:117`. A faixa de tablet (768–1024px) fica com a sidebar de 64 (`w-64`) comendo largura útil e precisa de verificação caso a caso.

**Páginas a auditar:** `/feed`, `/projetos`, `/projeto/[id]`, `/perfil`, `/equipe/[id]`, `/equipes`.

**US-023 — "cartão de visitas digital":** em `/projeto/[id]` no viewport de 360px, devem estar visíveis **acima da dobra**, sem scroll: capa, logo, nome do projeto, categoria e o nome do responsável. A descrição completa, membros da equipe e comentários vêm abaixo. O objetivo é que alguém mostrando o celular numa feira exiba a identidade do projeto de imediato.

---

## 4. Arquitetura e Dados

### 4.1 US-026 — JWT em cookie HttpOnly/Secure

**Backend**

- `config.py`: novas settings `cookie_name` (default `capmar_token`), `cookie_secure: bool` (default `False` em dev, `True` em produção via env) e `cookie_samesite` (default `lax`).
- `routers/auth.py`: `register` e `login` passam a receber `response: Response` e emitir o cookie:
  ```python
  response.set_cookie(
      key=settings.cookie_name,
      value=token,
      httponly=True,
      secure=settings.cookie_secure,
      samesite=settings.cookie_samesite,
      max_age=settings.access_token_expire_minutes * 60,
      path="/",
  )
  ```
- Novo `POST /auth/logout` → `response.delete_cookie(...)` com os mesmos `path`/`samesite`.
- Novo `GET /auth/me` → `UserRead` do usuário autenticado. Passa a ser a fonte de verdade da sessão no frontend, já que o token deixa de ser legível por JS.
- `deps.py`: `_user_from_credentials` passa a aceitar **duas** origens — o cookie (`request.cookies.get(settings.cookie_name)`) e, como fallback temporário, o header `Authorization: Bearer`. O fallback existe apenas para não quebrar clientes durante a migração e **deve ser removido ao final da sprint**.
- `main.py`: o middleware CORS **já** está com `allow_credentials=True` e origens explícitas (`main.py:66`) — nada a mudar, apenas confirmar que `CORS_ORIGINS` lista a origem real do frontend em cada ambiente. Com `allow_credentials`, o wildcard `*` é rejeitado pelo navegador.

**Frontend**

- `lib/api.ts`: `authHeader()` é removido; todos os helpers (`getJson`, `postJson`, `patchJson`, `deleteRequest`, `uploadImage`) passam a enviar `credentials: "include"`.
- `saveSession()` deixa de gravar `access_token`; `getToken()` é removido. O cache de usuário em `localStorage` pode ser mantido apenas como otimização de primeira pintura, nunca como fonte de autorização.
- `AuthGuard.tsx` valida a sessão chamando `GET /auth/me` em vez de checar a presença do token.
- `clearSession()` passa a chamar `POST /auth/logout`.

**Decisão a registrar:** em produção, se o frontend e a API ficarem em hosts diferentes (ex.: `capmar.app` e `api.capmar.app`), `samesite=lax` não envia o cookie em requisições cross-site — será preciso `samesite=none` **com** `secure=true`, ou servir a API sob o mesmo domínio, num path dedicado (`/api`). A segunda opção é a preferida, mas depende de como o roteamento de produção for definido na spec de infraestrutura. Enquanto essa decisão não sai, `cookie_samesite` fica configurável por variável de ambiente e o desenvolvimento local segue com `lax` (frontend e API compartilham `localhost`).

**Risco:** esta frente toca autenticação inteira, backend e frontend. Deve ser feita numa branch isolada e com o fluxo de login/cadastro/logout testado manualmente antes do merge.

### 4.2 US-036 — Transações ACID

O padrão atual dá `db.commit()` dentro de cada função de `crud.py` — 18 ocorrências — e não existe **nenhum** `rollback` no backend. Uma operação que escreva em duas tabelas (projeto + palavras-chave, o caso do US-010) pode, portanto, gravar metade e falhar na outra.

**Mudança:** mover a fronteira transacional para a dependência de sessão, um commit por request.

- `database.py`:
  ```python
  def get_db():
      db = SessionLocal()
      try:
          yield db
          db.commit()
      except Exception:
          db.rollback()
          raise
      finally:
          db.close()
  ```
- `crud.py`: cada `db.commit()` vira `db.flush()` quando a função precisa do ID gerado logo em seguida; os `db.refresh()` seguem funcionando dentro da transação aberta.
- Endpoints que hoje dependem do commit intermediário para ler o objeto recém-criado continuam funcionando, pois `flush` já envia o INSERT ao banco.

**Atenção:** `HTTPException` levantada dentro de um endpoint também dispara o `rollback` — que é o comportamento desejado (nada gravado quando a requisição falha). Validações que hoje ocorrem *depois* de um commit precisam ser conferidas uma a uma durante o refactor.

### 4.3 US-010 — Palavras-chave

O modelo já existe: `Keyword` (`models.py:131`) e as tabelas M2M `projects_keywords`, `team_keywords`, `user_keywords` (`models.py:32`+), com `Project.keywords` (`models.py:88`) mapeado. **Não existe nada em `schemas.py`, `crud.py`, nos routers ou em `lib/api.ts`** — as palavras-chave são hoje inacessíveis pela API.

- `schemas.py`:
  - `KeywordRead { keyword_id: int, word: str, popularity: int }`
  - `ProjectCreate` / `ProjectUpdate` ganham `keywords: list[str] | None = None`
  - `ProjectRead` ganha `keywords: list[KeywordRead] = []`
- `crud.py`: `get_or_create_keywords(db, words: list[str]) -> list[Keyword]`
  - Normaliza: `strip()`, `lower()`, descarta vazias, deduplica, trunca em 20 caracteres (limite da coluna `word`).
  - Reaproveita palavras existentes; cria as novas; incrementa `popularity` a cada associação.
  - Limite de **10 palavras-chave por projeto**, validado no schema.
- `routers/projects.py`: `create_project` e `update_project` associam as palavras-chave. Em `PATCH`, `keywords` ausente mantém as atuais; `keywords: []` remove todas.
- Novo `GET /keywords?limit=20` ordenado por `popularity` desc — alimenta o autocomplete da US-009 no Sprint 2.
- `lib/api.ts`: tipo `Keyword`, campo `keywords` em `Project` e `ProjectPayload`.

Esta frente **depende de 4.2** — a escrita em `project` + `projects_keywords` precisa ser atômica.

### 4.4 US-007 e US-008 — Busca e filtro

**Backend** — `crud.list_projects` (`crud.py:79`) hoje aceita apenas `skip`/`limit`.

```python
def list_projects(db, skip=0, limit=100, q=None, category_id=None):
```
- `category_id` → `.where(models.Project.category_id == category_id)`
- `q` → `ILIKE` sobre `name` **ou** `description` **ou** a palavra-chave associada:
  ```python
  termo = f"%{q.strip()}%"
  stmt = stmt.outerjoin(models.Project.keywords).where(
      or_(
          models.Project.name.ilike(termo),
          models.Project.description.ilike(termo),
          models.Keyword.word.ilike(termo),
      )
  ).distinct()
  ```
- Os dois filtros são combináveis (AND entre eles).
- `q` com menos de 2 caracteres é ignorado.

**Endpoint** — `GET /projects?q=&category_id=&skip=&limit=` em `routers/projects.py:24`. O contrato de resposta (`list[ProjectRead]`) não muda, o que mantém compatibilidade com quem já consome a rota.

**Frontend** — `listProjects()` (`lib/api.ts:205`) passa a aceitar parâmetros:
```ts
export function listProjects(params?: { q?: string; category_id?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  const suffix = qs.toString() ? `?${qs}` : "";
  return getJson<Project[]>(`/projects${suffix}`);
}
```
A página `/projetos` já carrega `listCategories()`, então o `<select>` de filtro não exige requisição nova. O debounce de 300ms deve cancelar a busca anterior (`AbortController`) para evitar respostas fora de ordem.

**Nota de escopo:** paginação de resultados **não** entra nesta spec; `limit=100` continua sendo o teto. Com o volume esperado no MVP isso é suficiente, e a decisão deve ser revista quando a base passar de ~100 projetos.

### 4.5 CFG-01 — `SECRET_KEY` obrigatória

Hoje a chave não aparece em `.env.example` nem em `docker-compose.yml`, então o container sobe com o valor padrão de `config.py` — e esse valor assina todos os JWTs em produção.

- `.env.example`: incluir `SECRET_KEY=`, `COOKIE_SECURE=false` e `ACCESS_TOKEN_EXPIRE_MINUTES=10080`, com comentário explicando que a chave deve ser gerada com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `docker-compose.yml`: no serviço `backend`, `SECRET_KEY: ${SECRET_KEY:?defina SECRET_KEY no .env}` — a sintaxe `:?` **falha o boot** se a variável estiver ausente, que é o comportamento desejado.
- `config.py`: manter um default apenas para desenvolvimento local, mas registrar um `warning` no startup quando ele estiver em uso.

### 4.6 US-032 — GitFlow

Não gera código; é convenção de trabalho, e deve valer **a partir da primeira frente desta spec**.

- Criar a branch `develop` a partir de `main`. `main` passa a receber apenas releases.
- Nomenclatura: `feature/us-XXX-descricao-curta`, `release/x.y`, `hotfix/descricao`.
- Todo merge em `develop` e em `main` passa por Pull Request com pelo menos uma revisão.
- Cada frente desta spec vira uma feature branch própria — elas tocam arquivos diferentes e podem seguir em paralelo, com exceção das dependências listadas em 4.7.

### 4.7 Ordem de execução e dependências

| # | Frente | Depende de | Onde |
|---|--------|-----------|------|
| 0 | US-032 — criar `develop` e convenções | — | repositório |
| 1 | CFG-01 — `SECRET_KEY` no ambiente | — | backend/infra |
| 2 | US-036 — transações no `get_db` | — | backend |
| 3 | US-010 — palavras-chave na API | 2 | backend + tipos do front |
| 4 | US-007 / US-008 — busca e filtro | 3 | backend + frontend |
| 5 | US-026 — cookie HttpOnly | 1 | backend + frontend |
| 6 | US-023 / US-024 — responsividade | 4, 5 | frontend |

As frentes 1 e 2 não dependem de nada e podem começar juntas. A frente 6 é de validação e fecha a sprint, depois que as telas pararem de mudar.

---

## 5. Critérios de Aceite (DoD - Definition of Done)

### US-026 — Cookie HttpOnly/Secure
- [ ] Após o login, o cookie `capmar_token` existe com as flags `HttpOnly` e `SameSite`, e `Secure` quando `COOKIE_SECURE=true`.
- [ ] `document.cookie` no console do navegador **não** retorna o token.
- [ ] Nenhuma chave de token permanece em `localStorage` (verificado no DevTools → Application → Local Storage).
- [ ] `GET /auth/me` responde 200 com o usuário logado e 401 sem cookie.
- [ ] `POST /auth/logout` remove o cookie e as rotas autenticadas passam a responder 401.
- [ ] O fallback do header `Authorization: Bearer` foi removido de `deps.py` ao final da frente.
- [ ] Login, cadastro, logout, criação de projeto e upload de imagem funcionam de ponta a ponta com dados reais.

### US-036 — Transações ACID
- [ ] Não resta nenhum `db.commit()` em `crud.py`.
- [ ] `get_db` faz commit no sucesso e rollback na exceção.
- [ ] Teste manual: forçar erro no meio da criação de um projeto com palavras-chave e confirmar que **nem** o projeto **nem** as associações foram gravados.
- [ ] Todos os fluxos de escrita existentes (usuário, projeto, equipe, post, comentário, like) seguem funcionando.

### US-010 — Palavras-chave
- [ ] `POST /projects` com `keywords: ["inovacao", "Maricá"]` cria o projeto e as duas palavras associadas.
- [ ] Enviar uma palavra já existente reaproveita o registro e incrementa `popularity`, sem duplicar linha em `keywords`.
- [ ] Palavras são normalizadas (minúsculas, sem espaços nas pontas) e deduplicadas antes de gravar.
- [ ] `PATCH` com `keywords: []` remove todas as associações; sem o campo, mantém as atuais.
- [ ] `GET /projects/{id}` retorna o array `keywords` populado.
- [ ] Limite de 10 palavras por projeto é rejeitado com 422.

### US-007 / US-008 — Busca e filtro
- [ ] `GET /projects?q=texto` retorna projetos cujo nome, descrição **ou** palavra-chave contenham o termo, sem duplicatas.
- [ ] A busca é case-insensitive e funciona com acentos.
- [ ] `GET /projects?category_id=N` retorna apenas projetos daquela categoria.
- [ ] Os dois parâmetros combinados aplicam AND.
- [ ] Na página `/projetos`, digitar filtra a grade com debounce de 300ms sem recarregar a página.
- [ ] Os estados de loading, empty e error foram implementados conforme a seção 3.1.
- [ ] Os filtros aparecem na URL e sobrevivem a um refresh.
- [ ] Buscas rápidas em sequência não produzem resultado fora de ordem.

### CFG-01 — `SECRET_KEY`
- [ ] `docker compose up` **falha** com mensagem clara quando `SECRET_KEY` não está definida no `.env`.
- [ ] `.env.example` documenta a variável e como gerá-la.
- [ ] O startup registra um aviso quando o secret padrão de desenvolvimento está em uso.

### US-023 / US-024 — Mobile e responsividade
- [ ] `/feed`, `/projetos`, `/projeto/[id]`, `/perfil`, `/equipe/[id]` e `/equipes` renderizam corretamente em 360px, 768px, 1024px e 1440px.
- [ ] Nenhuma página apresenta scroll horizontal em 360px.
- [ ] Nenhum elemento interativo tem alvo de toque menor que 44×44px no mobile.
- [ ] Em 768–1024px o conteúdo principal não fica espremido pela sidebar.
- [ ] Em `/projeto/[id]` a 360px, capa, logo, nome, categoria e responsável estão visíveis sem scroll.
- [ ] O bottom nav não cobre conteúdo nem ações no fim da página.

### US-032 — GitFlow
- [ ] A branch `develop` existe e é a base das feature branches.
- [ ] Cada frente desta spec foi entregue por Pull Request revisado.
- [ ] `main` não recebeu commit direto durante a sprint.

### Transversal
- [ ] `npm run lint` passa sem erros no frontend.
- [ ] `npm run build` conclui sem erros.
- [ ] Nenhuma regressão nos fluxos já existentes (autenticação, CRUD de projetos, equipes, feed, likes, comentários, upload).

---

## 6. Referências e Links Úteis

- `docs/CapMar_Backlog_Cronograma.pdf` — backlog e cronograma oficiais (Sprint 1: 10 a 23 de setembro de 2026).
- `backend/Database Schema.txt` — DBML, fonte de verdade do schema.
- `docs/DOCUMENTACAO-BACKEND.md` — documentação da API atual.
- `CLAUDE.md` — convenções do repositório; ver a nota sobre `_SCHEMA_PATCHES` em `app/main.py` ao adicionar colunas a tabelas existentes.
- `frontend/sdd/TEMPLATE.md` — template desta especificação.
- [OWASP — JWT em cookies vs. localStorage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)

### Pontos em aberto para a equipe

1. **Domínio da API em produção** — decide o `SameSite` do cookie (seção 4.1). Preferência registrada: servir a API sob `/api` no mesmo domínio do frontend.
2. **Reprogramar a US-028 (rate limiting)** — prioridade Alta no backlog original, retirada desta spec. Sem ela, `/auth/login` e `/auth/register` aceitam tentativas ilimitadas. Definir em qual sprint entra, junto com a spec de infraestrutura de que depende.
3. **Escopo do US-010** — esta spec entrega modelagem + API. Confirmar com o time se isso fecha a história ou se ela só encerra junto com a UI da US-009 (Sprint 2).
4. **Paginação** — deixada fora do Sprint 1 (seção 4.4). Definir a sprint em que entra.
