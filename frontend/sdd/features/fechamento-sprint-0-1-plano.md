# Plano de Implementação — Fechamento Sprint 0 e 1

**Status:** Draft
**Data:** 09/09/2026
**Autor:** Cristian Barboza
**Spec de referência:** [`fechamento-sprint-0-1.md`](./fechamento-sprint-0-1.md)
**Janela:** Sprint 1 — 10 a 23 de setembro de 2026 (10 dias úteis)

---

## 1. Como usar este plano

A spec responde *o quê* e *por quê*. Este plano responde *em que ordem*, *em qual branch* e *como saber que terminou*.

São **sete frentes** (F0 a F6). Cada uma tem branch própria, lista de arquivos, passos numerados e uma verificação objetiva. Marque os checkboxes conforme avança — o arquivo é versionado, então o progresso fica visível para o time no PR.

O campo **Responsável** de cada frente está em aberto de propósito: a distribuição entre Andrey, Cristian, Endriel e Felipe é decisão da equipe no planejamento da sprint.

---

## 2. Convenções de branch e PR

Válidas a partir de agora (US-032).

| | |
|---|---|
| Branch base | `develop` |
| Branch de produção | `main` — recebe apenas releases, nunca commit direto |
| Feature branch | `feature/us-XXX-descricao-curta` |
| Correção urgente | `hotfix/descricao-curta` |
| Release | `release/x.y` |

**Regras:**
- Toda feature branch nasce de `develop` **atualizada** e volta para `develop` por Pull Request.
- Todo PR precisa de pelo menos **uma revisão** de outro integrante antes do merge.
- O PR descreve: qual história fecha, o que foi testado manualmente e o que ficou de fora.
- `npm run lint` e `npm run build` precisam passar antes de pedir revisão.
- Commits em português, no imperativo: `feat(auth): emite JWT em cookie HttpOnly`.

**Antes de abrir cada frente:**
```bash
git checkout develop && git pull
git checkout -b feature/us-XXX-descricao
```

---

## 3. Calendário sugerido

Sprint 1 vai de quinta 10/09 a quarta 23/09. Dias úteis: 10, 11, 14, 15, 16, 17, 18, 21, 22, 23.

| Dias | Frentes em curso |
|---|---|
| 10/09 (qui) | **F0** — base do GitFlow. Abrir **F1** e **F2** em paralelo. |
| 11/09 (sex) | **F1** fecha. **F2** em andamento. |
| 14–15/09 (seg–ter) | **F2** fecha. Abrir **F3**. |
| 16–17/09 (qua–qui) | **F3** fecha. Abrir **F4**. Abrir **F5** em paralelo (não conflita com F3/F4). |
| 18/09 (sex) | **F4** e **F5** em andamento. Checkpoint de meio de sprint. |
| 21/09 (seg) | **F4** fecha. **F5** fecha. |
| 22/09 (ter) | **F6** — auditoria de responsividade, com as telas já estáveis. |
| 23/09 (qua) | **F6** fecha. Merge final em `develop`, revisão do DoD da spec. |

**Caminho crítico:** F2 → F3 → F4. Atraso em F2 empurra tudo. F1, F5 e F6 têm folga.

---

## 4. Frentes

### F0 — Base do GitFlow

**Branch:** `develop` · **História:** US-032 · **Depende de:** — · **Responsável:** _a definir_

- [x] Criar `develop` a partir de `main` (`96c7584`).
- [ ] Publicar: `git push -u origin develop`.
- [ ] No GitHub, definir `develop` como *default branch* para que novos PRs apontem para ela por padrão.
- [ ] Commitar a spec e este plano em `develop`.
- [ ] Comunicar ao time: `main` fechada para commit direto a partir daqui.

**Verificação:** `git branch -vv` mostra `develop` rastreando `origin/develop`; um PR novo no GitHub já vem com base `develop`.

---

### F1 — `SECRET_KEY` obrigatória no ambiente

**Branch:** `feature/cfg-01-secret-key` · **História:** CFG-01 · **Depende de:** — · **Spec:** §4.5 · **Responsável:** _a definir_

**Arquivos:** `.env.example`, `docker-compose.yml`, `backend/app/config.py`, `backend/app/main.py`

- [ ] `.env.example`: acrescentar o bloco de auth com comentário de como gerar a chave.
  ```
  # Chave de assinatura dos JWTs. OBRIGATÓRIA — gere com:
  #   python -c "import secrets; print(secrets.token_urlsafe(48))"
  SECRET_KEY=
  # Validade do token, em minutos (padrão: 7 dias).
  ACCESS_TOKEN_EXPIRE_MINUTES=10080
  ```
- [ ] `docker-compose.yml`: no serviço `backend`, adicionar ao bloco `environment`:
  ```yaml
  SECRET_KEY: ${SECRET_KEY:?defina SECRET_KEY no .env}
  ACCESS_TOKEN_EXPIRE_MINUTES: ${ACCESS_TOKEN_EXPIRE_MINUTES:-10080}
  ```
  A sintaxe `:?` aborta o `up` com mensagem quando a variável está ausente.
- [ ] `config.py`: manter o default apenas para desenvolvimento e expor uma flag que diga se ele está em uso (ex.: comparar `settings.secret_key` com a constante de dev).
- [ ] `main.py`, dentro do `lifespan`: emitir `warnings.warn(...)` ou `logging.warning(...)` quando o secret de desenvolvimento estiver ativo.

**Verificação:**
1. `SECRET_KEY` vazia no `.env` → `docker compose up` falha com a mensagem definida.
2. `SECRET_KEY` preenchida → sobe normalmente, sem aviso.
3. `uvicorn` local sem `.env` → sobe e registra o aviso no log.

**Cuidado:** trocar a `SECRET_KEY` invalida todos os tokens já emitidos. Avisar o time de que será preciso refazer login após o merge.

---

### F2 — Transações ACID

**Branch:** `feature/us-036-transacoes-acid` · **História:** US-036 · **Depende de:** — · **Spec:** §4.2 · **Responsável:** _a definir_

**Arquivos:** `backend/app/database.py`, `backend/app/crud.py` (18 ocorrências de `db.commit()`), routers conforme necessário

- [ ] `database.py`: reescrever `get_db` com a fronteira transacional.
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
- [ ] `crud.py`: substituir cada `db.commit()` por `db.flush()`. São 18 — conferir uma a uma, sem `sed` cego.
- [ ] Revisar os `db.refresh()` que vinham logo após um commit: seguem válidos dentro da transação aberta, mas confirmar caso a caso.
- [ ] Revisar os routers em busca de validação ou leitura que dependesse do commit intermediário para enxergar o dado. `flush()` já envia o INSERT/UPDATE ao banco, então o padrão comum continua funcionando.
- [ ] **Não tocar** em `main.py:51` (`seed_categories`) nem em `ensure_schema`: usam `SessionLocal()`/`engine.begin()` fora do ciclo de request e têm o próprio controle transacional.
- [ ] Conferir que `HTTPException` levantada por um endpoint dispara o rollback — é o comportamento desejado, mas precisa ser verificado nos fluxos de erro existentes (403 de dono, 404, 400 de e-mail duplicado).

**Verificação — testar manualmente cada escrita:**
- [ ] Cadastro e login de usuário
- [ ] Criar, editar e excluir projeto
- [ ] Criar, editar e excluir equipe; adicionar e remover membro
- [ ] Criar e excluir post
- [ ] Curtir e descurtir projeto
- [ ] Criar e excluir comentário
- [ ] Atualizar perfil de usuário
- [ ] Upload de imagem
- [ ] **Teste de rollback:** provocar um erro no meio de uma escrita (ex.: `raise HTTPException` temporário depois do `flush` em `create_project`) e confirmar que nada foi gravado. Remover o código de teste depois.

**Risco:** é o refactor mais invasivo da sprint — toca todos os fluxos de escrita. Não acumular outras mudanças nesta branch.

---

### F3 — Palavras-chave na API

**Branch:** `feature/us-010-palavras-chave` · **História:** US-010 · **Depende de:** **F2** · **Spec:** §4.3 · **Responsável:** _a definir_

**Arquivos:** `backend/app/schemas.py`, `backend/app/crud.py`, `backend/app/routers/projects.py`, `backend/app/routers/keywords.py` (novo), `backend/app/main.py`, `frontend/src/lib/api.ts`

O modelo já existe (`models.py:131`, M2M em `models.py:32`, relação em `models.py:88`). O que falta é toda a camada de API.

- [ ] `schemas.py`: criar `KeywordRead { keyword_id, word, popularity }` com `from_attributes`.
- [ ] `schemas.py`: `ProjectCreate` e `ProjectUpdate` recebem `keywords: list[str] | None = None`, com `Field(max_length=10)` na lista.
- [ ] `schemas.py`: `ProjectRead` recebe `keywords: list[KeywordRead] = []`.
- [ ] `crud.py`: implementar `get_or_create_keywords(db, words) -> list[Keyword]`:
  - normalizar (`strip()`, `lower()`), descartar vazias, deduplicar, truncar em 20 caracteres (limite da coluna `word`);
  - reaproveitar registros existentes, criar os ausentes;
  - incrementar `popularity` a cada associação nova.
- [ ] `crud.py`: `create_project` e `update_project` passam a associar as palavras. Em `PATCH`, campo ausente mantém as atuais; `[]` remove todas.
- [ ] `crud.py`: adicionar `selectinload(models.Project.keywords)` a `_PROJECT_LOADS` para evitar N+1 na listagem.
- [ ] Novo `routers/keywords.py`: `GET /keywords?limit=20`, ordenado por `popularity` desc.
- [ ] `main.py`: `app.include_router(keywords.router)`.
- [ ] `lib/api.ts`: tipo `Keyword`, campo `keywords` em `Project` e em `ProjectPayload`, função `listKeywords()`.

**Verificação:**
- [ ] `POST /projects` com `keywords: ["inovacao", "Maricá", " inovacao "]` cria o projeto com **duas** palavras (dedupe + normalização).
- [ ] Repetir com uma palavra já existente: não duplica linha em `keywords` e `popularity` sobe.
- [ ] `GET /projects/{id}` retorna `keywords` populado.
- [ ] `PATCH` com `keywords: []` remove todas; sem o campo, preserva.
- [ ] Enviar 11 palavras → 422.
- [ ] Com F2 no lugar: forçar erro após criar as palavras e confirmar que nem o projeto nem as associações ficaram no banco.

**Escopo:** sem UI. A tela de associação de tags é US-009, Sprint 2.

---

### F4 — Busca e filtro por categoria

**Branch:** `feature/us-007-008-busca-filtro` · **Histórias:** US-007, US-008 · **Depende de:** **F3** · **Spec:** §3.1 e §4.4 · **Responsável:** _a definir_

**Arquivos:** `backend/app/crud.py`, `backend/app/routers/projects.py`, `frontend/src/lib/api.ts`, `frontend/src/app/(app)/projetos/page.tsx`

**Backend**
- [ ] `crud.py:79` — `list_projects` ganha `q: str | None = None` e `category_id: int | None = None`.
- [ ] `category_id` → `.where(models.Project.category_id == category_id)`.
- [ ] `q` → `outerjoin` em `Project.keywords` + `or_()` com `ilike` sobre `name`, `description` e `Keyword.word`, fechando com `.distinct()`.
- [ ] Ignorar `q` com menos de 2 caracteres após `strip()`.
- [ ] Os dois filtros combinam com AND.
- [ ] `routers/projects.py:24` — expor `q` e `category_id` como query params. O `response_model` não muda, o que preserva compatibilidade.

**Frontend**
- [ ] `lib/api.ts:205` — `listProjects(params?: { q?: string; category_id?: number })` montando a querystring com `URLSearchParams`.
- [ ] `/projetos/page.tsx` — barra de controles: campo de busca com ícone de lupa, `<select>` de categorias (a página já carrega `listCategories()`), botão "Limpar" condicional.
- [ ] Debounce de 300ms no campo de texto; troca de categoria dispara imediato.
- [ ] `AbortController` cancelando a requisição anterior a cada disparo.
- [ ] Sincronizar filtros com a URL (`?q=&categoria=`) via `router.replace`, e ler os valores iniciais da querystring.
- [ ] Estados: skeleton no primeiro carregamento, indicador discreto nas buscas seguintes, empty com o termo buscado, erro com "Tentar novamente".
- [ ] Contador "N projetos encontrados".

**Verificação:**
- [ ] `GET /projects?q=texto` acha por nome, por descrição e por palavra-chave, sem duplicatas.
- [ ] Busca é case-insensitive; testar com acento (`maricá`) e sem (`marica`) — registrar o comportamento encontrado.
- [ ] `GET /projects?category_id=N` retorna só daquela categoria; combinado com `q`, aplica AND.
- [ ] Na tela: digitar filtra sem recarregar; refresh mantém os filtros; voltar do detalhe do projeto preserva a busca.
- [ ] Digitar rápido e apagar não deixa resultado fora de ordem na tela.

**Fora de escopo:** paginação. `limit=100` segue como teto — ver *Pontos em aberto* da spec.

---

### F5 — JWT em cookie HttpOnly/Secure

**Branch:** `feature/us-026-cookie-httponly` · **História:** US-026 · **Depende de:** **F1** · **Spec:** §4.1 · **Responsável:** _a definir_

**Arquivos backend:** `config.py`, `routers/auth.py`, `deps.py`
**Arquivos frontend:** `lib/api.ts`, `(app)/AuthGuard.tsx`, `login/page.tsx`, `register/page.tsx`

**Backend**
- [ ] `config.py`: `cookie_name` (default `capmar_token`), `cookie_secure: bool` (default `False`), `cookie_samesite: str` (default `lax`) — todos por env.
- [ ] `.env.example` e `docker-compose.yml`: acrescentar `COOKIE_SECURE` e `COOKIE_SAMESITE`.
- [ ] `routers/auth.py`: `register` e `login` recebem `response: Response` e emitem o cookie com `httponly=True`, `secure=settings.cookie_secure`, `samesite=settings.cookie_samesite`, `max_age` derivado de `access_token_expire_minutes`, `path="/"`. Manter `access_token` no corpo da resposta durante a transição.
- [ ] Novo `POST /auth/logout` → `response.delete_cookie` com os mesmos `path` e `samesite`.
- [ ] Novo `GET /auth/me` → `UserRead` do usuário autenticado; 401 sem cookie.
- [ ] `deps.py`: `_user_from_credentials` passa a ler o cookie via `request.cookies.get(settings.cookie_name)`, mantendo o header `Bearer` como fallback temporário.
- [ ] CORS: nada a fazer — `main.py:66` já tem `allow_credentials=True` e origens explícitas. Só confirmar que `CORS_ORIGINS` aponta para a origem real do frontend.

**Frontend**
- [ ] `lib/api.ts`: remover `authHeader()` e acrescentar `credentials: "include"` em **todos** os helpers — `getJson`, `postJson`, `patchJson`, `deleteRequest` e `uploadImage`.
- [ ] `lib/api.ts`: `saveSession()` para de gravar `access_token`; `getToken()` é removido.
- [ ] `lib/api.ts`: `clearSession()` passa a chamar `POST /auth/logout`.
- [ ] `lib/api.ts`: acrescentar `getMe()` consumindo `GET /auth/me`.
- [ ] `AuthGuard.tsx:14`: trocar a checagem `if (getToken())` por validação via `getMe()`, com estado de carregando enquanto a resposta não chega.
- [ ] Revisar os 9 arquivos que consomem `getStoredUser()` — `feed`, `projetos`, `projeto/[id]`, `perfil`, `equipe/[id]`, `home`, `AppShell`, `login`, `register`. O cache em `localStorage` pode continuar como otimização de primeira pintura, **nunca** como fonte de autorização.
- [ ] **Ao final:** remover o fallback `Bearer` de `deps.py` e o `access_token` do corpo da resposta.

**Verificação:**
- [ ] Após o login, DevTools → Application → Cookies mostra `capmar_token` com `HttpOnly` marcado.
- [ ] `document.cookie` no console **não** retorna o token.
- [ ] Local Storage não guarda nenhuma chave de token.
- [ ] `GET /auth/me` → 200 logado, 401 deslogado.
- [ ] Logout apaga o cookie e as rotas autenticadas voltam a 401.
- [ ] Fluxo completo: cadastrar → criar projeto → subir imagem → editar → excluir → logout → tentar acessar `/perfil` e ser redirecionado.
- [ ] `COOKIE_SECURE=true` em HTTP local **não** grava o cookie — comportamento esperado, confirma que a flag funciona.

**Risco:** toca autenticação de ponta a ponta. Merge só depois do fluxo completo testado. Combinar com o time uma janela para o merge, já que todos precisarão refazer login.

---

### F6 — Responsividade e fluxo mobile

**Branch:** `feature/us-023-024-responsividade` · **Histórias:** US-023, US-024 · **Depende de:** **F4**, **F5** · **Spec:** §3.2 · **Responsável:** _a definir_

**Arquivos:** `(app)/AppShell.tsx` e as páginas auditadas

Frente de auditoria — roda com as telas já estáveis, no fim da sprint.

**Matriz de auditoria** — marcar cada página em cada viewport:

| Página | 360px | 768px | 1024px | 1440px |
|---|---|---|---|---|
| `/feed` | [ ] | [ ] | [ ] | [ ] |
| `/projetos` | [ ] | [ ] | [ ] | [ ] |
| `/projeto/[id]` | [ ] | [ ] | [ ] | [ ] |
| `/perfil` | [ ] | [ ] | [ ] | [ ] |
| `/equipe/[id]` | [ ] | [ ] | [ ] | [ ] |
| `/equipes` | [ ] | [ ] | [ ] | [ ] |

**Checagens transversais:**
- [ ] Nenhum scroll horizontal em 360px.
- [ ] Nenhum alvo de toque menor que 44×44px no mobile.
- [ ] O bottom nav (`AppShell.tsx:117`) não cobre conteúdo nem ações no fim da página — conferir se as páginas têm `padding-bottom` suficiente.
- [ ] Faixa 768–1024px: a sidebar `w-64` (`AppShell.tsx:50`) não espreme o conteúdo. Hoje a troca sidebar↔bottom nav acontece num único ponto (`md:`, 768px); avaliar se essa faixa precisa de tratamento próprio.

**US-023 — cartão de visitas digital:**
- [ ] Em `/projeto/[id]` a 360px, ficam visíveis **sem scroll**: capa, logo, nome, categoria e responsável.
- [ ] Descrição completa, equipe e comentários vêm abaixo da dobra.
- [ ] A página abre em tempo razoável em conexão móvel — medir com throttling no DevTools e registrar o número no PR.

---

## 5. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| F2 (transações) quebra um fluxo de escrita silenciosamente | Alto — não há testes automatizados para pegar | Checklist manual de 8 fluxos antes do PR; branch isolada, sem outras mudanças |
| F5 (cookie) quebra a autenticação para todo o time | Alto | Fallback `Bearer` mantido durante a frente; merge em janela combinada; todos refazem login |
| Trocar a `SECRET_KEY` (F1) invalida os tokens existentes | Médio | Avisar antes do merge; efeito é só refazer login |
| F2 atrasa e empurra F3 e F4 | Médio | É o caminho crítico — começar no dia 10 e não acumular escopo |
| Busca com acento se comportar diferente do esperado no Postgres | Baixo | Verificar em F4 e registrar; se necessário, `unaccent` fica para outra sprint |
| Ausência de testes automatizados em toda a sprint | Médio | Fora do escopo (Sprint 4), mas o custo aparece aqui: toda verificação é manual |

---

## 6. Fechamento da sprint

- [ ] As sete frentes mergeadas em `develop` via PR revisado.
- [ ] Nenhum commit direto em `main` durante a sprint.
- [ ] Todos os critérios de aceite da spec (§5) marcados.
- [ ] `npm run lint` e `npm run build` passando.
- [ ] Fallback `Bearer` removido de `deps.py`.
- [ ] Pontos em aberto da spec revisitados com o time: domínio da API em produção, reprogramação da US-028 (rate limiting), escopo do US-010, paginação.
- [ ] Retrospectiva: o que da dívida do Sprint 0 apareceu tarde demais e por quê.
