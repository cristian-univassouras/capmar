# Fase B — segurança e integridade

Implementação na branch `segurança-integridade`. Base: `main`; branches antigas consultadas por diff, sem checkout nem merge indiscriminado:
- `origin/feature/cfg-01-secret-key` (`b3fb971`): conceito de configuração por ambiente, complementado com recusa de produção.
- `origin/feature/us-026-cookie-httponly` (`12b29e7`): transporte por cookie e adaptação do cliente, completados com revogação e remoção de Bearer/JSON.
- `origin/feature/us-036-transacoes-acid` (`fd9d219`): CRUD com flush e uma transação por operação, com commit antes de enviar a resposta.

## Entrega e critérios

| Item | Implementação | Evidência |
| --- | --- | --- |
| 04 / SEG-01 | Produção recusa segredo ausente, branco, curto ou reconhecido como exemplo/desenvolvimento; exige PostgreSQL, HTTPS e cookie Secure. Arquivos de ambiente excluídos do Git e builds. | Testes de configuração e relatórios Gitleaks. |
| 05 / US-026, SEG-08 | Cookie HttpOnly; Secure obrigatório em produção. JWT com sessão registrada no banco, expiração e revogação no logout. Resposta de login/cadastro contém apenas usuário. Bearer encerrado. | Testes de cookie, token inválido, expirado, usuário removido, logout e cliente web. |
| 06 / SEG-10 | Todas as escritas exigem `X-CSRF-Protection: 1`. Origens comparadas exatamente; CORS sem curingas. JSON obrigatório em escritas JSON e multipart no upload. | Testes de origem, cabeçalhos, JSON, multipart e corpo fragmentado. |
| 07 / SEG-02 | Filtro de projeto aplicado no SQL das listagens e nas verificações de detalhes, comentários, likes, equipes, feed e mídias. Uploads deixam de ser estáticos. | Matriz de visitante, não autorizado, membro, proprietário e líder; mídia acompanha mudança de visibilidade e remoção de membro. |
| 08 / SEG-03, SEG-04 | Usuários públicos sem e-mail. Categorias: escrita desabilitada. Equipes só pelo proprietário; publicações vinculadas só pelo proprietário ou líder do projeto. | Testes de respostas e escrita em cada papel. |
| 09 / US-028, SEG-06, SEG-12 | Limites atômicos no PostgreSQL, por IP/conta/usuário. Paginação e comprimentos limitados. Senhas acima de 72 bytes UTF-8 rejeitadas, sem truncar. | Testes de excesso, UTF-8, corpo, paginação e contadores concorrentes. |
| 10 / US-035, SEG-05 | Formato real decodificado e reencodificado; limite de 5 MB, 8000 por lado e 16 milhões de pixels. Cota por usuário, vínculo único e manutenção de órfãos. | Testes de formato falso, tamanho, dimensão, animação, cota concorrente, importação e limpeza. |
| 11 / US-036, SEG-07 | Um commit por operação, CRUD com flush, rollback de falhas compostas. Conflitos retornam 409; indisponibilidade/conflito operacional retorna 503. Validações de nulos, estados e comprimentos. | Falha simulada e FK realmente adiada ao commit, sem sucesso antecipado nem escrita parcial. |
| 12 / SEG-14, SEG-15 | Alembic versionado, baseline legado congelado, startup sem DDL. Receita de papéis separados e auditorias de dependências/segredos. | Migração de banco novo e legado repetida; testes, build e relatórios de auditoria. |

Esses critérios foram verificados no ambiente de desenvolvimento/teste. A implantação e a revisão dos dados reais existentes seguem o procedimento abaixo; nenhum banco de produção foi acessado ou alterado.

## Matriz adotada

- Projeto público (`visibility=true`): leitura por visitante e autenticados.
- Projeto privado: leitura pelo proprietário, membro explícito do projeto, líder ou membro de equipe vinculada.
- Comentários, likes, equipes, publicações vinculadas e mídias do projeto seguem a mesma visibilidade.
- Projeto: edição e exclusão somente pelo proprietário.
- Equipe: criação pelo proprietário do projeto; edição, exclusão e gestão de membros pelo líder. Transferência para outro projeto é recusada.
- Publicação vinculada: criação pelo proprietário ou líder de equipe desse projeto. Exclusão pelo autor, com acesso ao projeto.
- Comentário: criação por autenticado com acesso; exclusão pelo autor ou proprietário, com acesso.
- Perfil público e avatar são públicos; e-mail só em `/auth/me`, login/cadastro e atualização do próprio perfil.
- Categorias são lidas publicamente e sem escrita pela API. Seeds pertencem à migração.
- Projeto legado sem proprietário não ganha proprietário automaticamente. Atribuição exige revisão operacional explícita.

Erros de leitura privada usam 404. O fato de possuir a URL de uma mídia não concede acesso.

## Sessão, CSRF e frontend

O navegador usa `credentials: include` e nunca recebe o JWT no JSON. Qualquer token do localStorage antigo é removido ao usar a API ou ler o cache de usuário. A sessão é confirmada em `/auth/me`; 401 limpa o cache e sinaliza expiração às telas protegidas. Falha de rede não é apresentada como logout concluído.

Cada login cria uma sessão no PostgreSQL, com máximo de dez por usuário, e revoga o cookie anterior quando válido. Logout remove o registro no banco e o cookie. Cookies copiados não continuam válidos após logout. A migração invalida JWTs antigos sem sessão; todos os clientes antigos precisam entrar novamente. Não há fallback Bearer nem endpoint de emissão de token para JavaScript.

A proteção CSRF usa o padrão de cabeçalho personalizado para APIs: formulários simples não conseguem enviar `X-CSRF-Protection`, e uma origem externa não aprovada não passa no preflight. Mesmo quando o cabeçalho é enviado, uma origem presente e não aprovada é recusada. Clientes de linha de comando sem Origin podem operar com cookie e cabeçalho explícito; o navegador não consegue forjar esse fluxo por formulário.

Exemplo para cliente de linha de comando:

```bash
curl -c cookies.txt -H 'Content-Type: application/json' -H 'X-CSRF-Protection: 1' \
  --data '{"email":"usuario@example.com","password":"senha-do-usuario"}' https://api.example.com/auth/login
curl -b cookies.txt https://api.example.com/auth/me
curl -b cookies.txt -H 'X-CSRF-Protection: 1' -X POST https://api.example.com/auth/logout
```

Prefira frontend/API no mesmo site (por exemplo, app.example.com e api.example.com). Sites distintos exigem `COOKIE_SAMESITE=none` e Secure, e ainda dependem da política de cookies de terceiros do navegador. Não coloque cache público/CDN sobre `/uploads` ou respostas autenticadas: a API envia no-store.

## Variáveis

| Variável | Desenvolvimento | Produção |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | **`production`** |
| `SECRET_KEY` | Exemplo público apenas local | **Obrigatória**, aleatória, pelo menos 32 bytes |
| `DATABASE_URL` / `APP_DATABASE_URL` no compose de produção | Credencial local | **Obrigatória**, PostgreSQL, papel somente DML |
| `MIGRATION_DATABASE_URL` | Opcional para CLI; compose local usa banco local | **Obrigatória no serviço de migração**, papel proprietário do schema |
| `CORS_ORIGINS` | `http://localhost:3000` | **Obrigatória**, lista HTTPS separada por vírgula, sem caminho/barra final/curinga |
| `COOKIE_SECURE` | `false` | **true**, imposto pelo compose de produção |
| `COOKIE_SAMESITE` | `lax` | lax/strict, ou none com Secure |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | **IPs/redes explícitos dos proxies confiáveis**; `*` recusado |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | **URL HTTPS pública**, disponível no build |
| `POSTGRES_PASSWORD` | Exemplo local | **Senha administrativa própria**, distinta dos dois papéis |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 10080 | 1 a 10080; ajuste conforme política de sessão |
| `UPLOAD_QUOTA_BYTES` / `UPLOAD_QUOTA_COUNT` | 52428800 / 100 | Mesmos defaults; cota inclui imagens pendentes |
| `UPLOAD_ORPHAN_HOURS` | 24 | Prazo mínimo para limpeza de órfãos |
| `LOGIN_LIMIT` / `REGISTER_LIMIT` / `WRITE_LIMIT` | 10 / 5 / 120 | Configuráveis, positivos |

Gere o segredo localmente e guarde em secret manager ou arquivo ignorado:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Não copie a saída para documentação, commits ou argumentos de linha de comando. Rotacionar SECRET_KEY invalida todas as sessões.

Os limites padrão são: login 10 por conta e 30 por IP em 15 minutos; cadastro 5 por IP/hora; escritas 120 por IP/minuto e 120 por usuário/minuto. São janelas fixas (pode haver rajada na virada), compartilhadas por workers e máquinas que usam o mesmo banco. Tentativas malsucedidas também consomem limite; 429 informa Retry-After. Falha no armazenamento do contador resulta em 503, não em liberação ilimitada. Não configure o proxy para confiar em X-Forwarded-For enviado diretamente por clientes.

Listagens: 1–100 itens, offset 0–10000. Conteúdo/comentário/propósito: 5000 caracteres; descrição de projeto: 10000; e-mail: 50; equipes: 100 membros. Senhas: mínimo de cadastro existente de seis caracteres e máximo de 72 bytes UTF-8, sem remover espaços. Contas antigas que dependiam de senha truncada precisam de redefinição operacional; não há recuperação de senha implementada nesta fase.

## Migração e implantação

### Desenvolvimento

`docker compose up --build` executa o serviço `migrate` antes da API. PostgreSQL fica publicado somente em localhost. O compose base é de desenvolvimento, com credenciais de exemplo.

Sem Docker, a partir de backend:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Produção / banco existente

1. Faça backup verificável do banco e volume antigo de uploads. Pause as escritas durante migração/importação.
2. Provisione os papéis de `backend/scripts/database-roles.sql`, como administrador. Defina senhas distintas com `\password` no psql ou secret manager. Dê CONNECT no banco se a instalação tiver removido o privilégio público.
3. Em banco legado, inventarie somente os objetos da aplicação e transfira suas tabelas/sequências para `capmar_migrator`. A aplicação não pode continuar proprietária dos objetos. Consulte `pg_tables` e `pg_sequences` no schema public; execute `ALTER TABLE ... OWNER TO capmar_migrator` e `ALTER SEQUENCE ... OWNER TO capmar_migrator` para o inventário revisado.
4. Execute `alembic upgrade head` com MIGRATION_DATABASE_URL. Não use `stamp head` para pular execução.
5. Execute os GRANTs finais da receita e retire INSERT/UPDATE/DELETE de alembic_version do papel da aplicação. O backend necessita SELECT dessa tabela, mas não CREATE/ALTER/DROP.
6. Execute a importação de mídias legadas, descrita abaixo, antes de reabrir tráfego. Revise projetos/equipes sem proprietário/líder e dados fora dos novos limites. A migração interrompe com erro em dados incompatíveis, duplicações de e-mail por caixa ou equipes com mais de 100 integrantes.
7. Configure as variáveis de produção e termine HTTPS em proxy confiável. Inicie com:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d
```

8. Confirme login, /auth/me, logout, escrita JSON, upload e leitura privada pela URL externa. Teste a aplicação com o papel DML e confirme que CREATE TABLE é negado. Não forneça MIGRATION_DATABASE_URL ao processo da API.
9. Programe a manutenção no ambiente de implantação: `python -m app.maintenance cleanup`, ao menos de hora em hora. Esse comando não foi agendado automaticamente no computador do usuário.

Migrações: `0001_baseline` usa uma cópia congelada do schema anterior e incorpora as seis adições legadas conhecidas. `0002_security` adiciona sessões/limites/mídias, FKs e checks, normaliza e-mails após verificar duplicidades e faz exclusão de projeto remover suas publicações. Reexecutar upgrade head é seguro. Downgrade destrutivo é recusado; recuperação usa o backup. Schemas antigos diferentes dos reconhecidos exigem revisão, sem adivinhação de dados.

A API apenas confere a versão na inicialização. CRUD usa flush e a dependência `get_db` com `scope="function"` executa commit antes de qualquer resposta. Atualizações concorrentes incompatíveis falham de forma controlada; o cliente deve recarregar e repetir a ação.

## Mídias e órfãos

Novas imagens ficam em `media_uploads` no PostgreSQL, inclusive os bytes. Para este volume e limite de 5 MB, isso permite atomicidade e autorização sem servidor estático ou arquivos parcialmente gravados. O custo é maior uso de banco/backup; para escala maior, planejar object storage privado com entrega autorizada mantendo os mesmos vínculos.

O formato é detectado com Pillow. JPEG/PNG/WebP/GIF estático são aceitos; animações são recusadas. A imagem é decodificada com limites e reencodificada em WebP, removendo metadados e bytes extras. O corpo inteiro da requisição é limitado antes do parser, inclusive sem Content-Length: 64 KiB para JSON e 5 MiB + 64 KiB para multipart.

Um upload começa privado ao remetente. Só pode ser associado a um recurso, impedindo reutilizar o anexo de um projeto privado em perfil público. Quando desvinculado, volta a ser privado. `DELETE /uploads/{id}` remove mídia própria sem vínculo; cleanup remove órfãos antigos e mídia de recursos excluídos, além de sessões e contadores expirados.

Arquivos antigos **não são mais servidos diretamente**. Com UPLOAD_DIR apontando para o backup/volume:

```bash
python -m app.maintenance import-legacy
```

O comando importa cada recurso em uma transação, valida/reencodifica, cria cópias independentes para vínculos distintos e atualiza as URLs. É repetível e mantém arquivos originais. URLs externas, caminhos inválidos, ausência de proprietário, arquivo ausente/formato inválido e cota excedida ficam pendentes, com código de saída 1. Não descarte o volume até revisar as pendências e o backup. URLs antigas ficam 404 até serem substituídas.

## Verificação reproduzível e auditoria

Resultado local: **41 testes de backend e 4 de frontend aprovados**, lint sem erros/avisos, build de produção do frontend e imagem Docker Linux do backend aprovados. Há avisos de depreciação nas bibliotecas de teste e aviso de chave curta apenas ao usar o segredo público de desenvolvimento; produção recusa esse segredo.

Backend: PostgreSQL 16 descartável chamado capmar_test; não use banco real. Na pasta backend:

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg2://USUARIO:SENHA@127.0.0.1:PORTA/capmar_test'
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
```

Os testes apagam dados **somente nesse banco de teste**. Incluem cookies, CSRF, acesso, quotas concorrentes, importação/órfãos, migração nova/legada, limite compartilhado, rollback composto e commit com FK adiada.

Frontend: `npm ci`, `npm test`, `npm run lint`, `npm run build`. Os quatro testes do módulo API cobrem credenciais/CSRF, remoção de token antigo, upload multipart, logout com falha de rede e sessão expirada. Não substituem a validação no navegador da URL final de produção.

Auditorias executadas em 13/09/2026:
- pip-audit sobre requirements.txt e sobre todas as dependências instaladas na imagem Linux: nenhum alerta conhecido, após atualização das dependências Python.
- npm audit: nenhum alerta conhecido, após atualização para Next.js/eslint-config-next 16.3.5 e transitivas corrigidas.
- Gitleaks 8.30.1: nenhum segredo detectado nos 17 commits de todas as refs disponíveis, backend e frontend/src. Scanner obtido da release oficial e validado por SHA-256.
- Relatórios JSON nesta pasta: `pip-audit-phase-b.json`, `pip-audit-linux-phase-b.json`, `npm-audit-phase-b.json`, `gitleaks-*-phase-b.json`.

Auditorias são fotografias do momento, não prova de ausência absoluta de vulnerabilidades ou segredos. Reexecute em mudanças de dependência e antes de implantar. Se um segredo real for encontrado, revogue/rotacione primeiro; reescrita de histórico compartilhado exige coordenação. Os únicos segredos deliberadamente presentes aqui são valores públicos de desenvolvimento/teste.

Referências técnicas: [FastAPI: dependências e momento do cleanup](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/), [OWASP: CSRF com cabeçalhos personalizados](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi), [Pillow: limites e segurança](https://pillow.readthedocs.io/en/stable/handbook/security.html).
