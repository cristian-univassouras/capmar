# CapMar 🌊

A CapMar é uma plataforma web desenvolvida para aumentar a visibilidade de pequenos e médios projetistas e microempreendedores da cidade de Maricá, conectando seus projetos a potenciais investidores e apoiadores locais.

Quem cria apresenta o projeto (capa, materiais, vídeos, equipe, apoio), quem quer apoiar conhece a pessoa por trás e conversa direto por mensagem. Visitantes veem os projetos públicos sem precisar de conta.

## ✨ O que já existe
- **Vitrine pública:** landing, busca e categorias, página de projeto com materiais, comentários, equipe, QR Code e compartilhamento.
- **Contas e segurança:** cadastro, login por cookie `HttpOnly`, recuperação de senha por e-mail, autenticação em duas etapas (MFA) e rotas protegidas.
- **Comunidade:** publicações, curtidas, comentários, equipes, perfis por @usuário e chat (mensagens diretas e de equipe).
- **Administração:** usuários, publicações e trilha de auditoria, com MFA obrigatório para administradores.
- **Identidade visual "Azulejo da Lagoa":** ver [`PRODUCT.md`](PRODUCT.md) (produto) e [`DESIGN.md`](DESIGN.md) (tokens, componentes e movimento).

## 🏗️ Arquitetura do Projeto
Este repositório está dividido em dois módulos principais. Recomendamos fortemente a adoção do padrão GitFlow (`main`, `develop`, `feature/*`) para o versionamento do código.

- [**Frontend**](./frontend/README.md): A interface do usuário desenvolvida em Next.js 16 (React 19, Tailwind CSS v4).
- [**Backend**](./backend/README.md): A API RESTful e lógica de negócios desenvolvida em Python / FastAPI com banco de dados PostgreSQL 16.

## 🚀 Como ligar o projeto

### O que você precisa
- [Docker](https://docs.docker.com/get-docker/) com Docker Compose (caminho recomendado), **ou**
- Node.js 20+ e Python 3.10+ com um PostgreSQL 16 acessível (caminho sem Docker).

### 1. Com Docker (recomendado)
Tudo sobe junto: banco, migrações, API, site e caixa de e-mail de teste.

```bash
# na raiz do repositório
cp .env.example .env
docker compose up --build
```

Quando terminar de subir, abra:

| O quê | Endereço |
|---|---|
| Site | http://localhost:3000 |
| API (documentação interativa) | http://localhost:8000/docs |
| E-mails de teste (Mailpit) | http://localhost:8025 |
| Postgres | `localhost:5432` (usuário, senha e banco `capmar` por padrão) |

Para parar, `Ctrl+C` ou `docker compose down` (os dados ficam guardados; `docker compose down -v` apaga o banco e os uploads).

**Porta 3000 ocupada?** Mude `FRONTEND_PORT` no `.env` e ajuste junto `SITE_URL` e `CORS_ORIGINS` para a mesma porta (por exemplo `http://localhost:3001`), depois rode `docker compose up --build` de novo.

> O endereço da API (`NEXT_PUBLIC_API_URL`) é gravado **na hora do build** do frontend. Se mudar, refaça o build: `docker compose build frontend`.

### 2. Sem Docker (desenvolvimento)
Use três terminais, a partir da raiz.

**Banco de dados** (pode ser só o Postgres do Docker):
```bash
docker compose up db mailpit
```

**Backend** (API em http://localhost:8000):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://capmar:capmar@localhost:5432/capmar
export CORS_ORIGINS=http://localhost:3000
alembic upgrade head             # cria/atualiza as tabelas
uvicorn app.main:app --reload
```
Se a API recusar a subir com "Banco desatualizado", falta rodar `alembic upgrade head`. Os e-mails de recuperação de senha aparecem no Mailpit quando `SMTP_HOST=localhost` e `SMTP_PORT=1025`.

**Frontend** (site em http://localhost:3000):
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### 3. Criar a primeira conta de administrador
Administradores exigem autenticação em duas etapas. A conta é criada por linha de comando, num terminal seguro (com o `DATABASE_URL` configurado):

```bash
cd backend
python -m app.admin_cli create-admin admin@exemplo.com meu_admin
```
O comando pede a senha (mínimo de 12 caracteres), um motivo para a auditoria e mostra uma chave para cadastrar no aplicativo autenticador. Com Docker, rode dentro do container: `docker compose exec backend python -m app.admin_cli create-admin admin@exemplo.com meu_admin`.

### 4. Testes
```bash
# frontend: unidade
cd frontend && npm test

# frontend: ponta a ponta (precisa de site em localhost e API no ar)
E2E_BASE_URL=http://localhost:3000 npx playwright test --project=desktop

# backend (exige um PostgreSQL descartável chamado capmar_test)
cd backend
pip install -r requirements-dev.txt
TEST_DATABASE_URL=postgresql+psycopg2://capmar:capmar@localhost:5432/capmar_test pytest
```
Os testes ponta a ponta só rodam contra `localhost` e usam contas de teste criadas por eles mesmos ou pelos fixtures locais. O login limita 10 tentativas por conta a cada 15 minutos; ao repetir a suíte várias vezes, o backend pode responder 429 até a janela passar.

### Problemas comuns
| Sintoma | Causa provável |
|---|---|
| Site abre mas nada carrega, console fala em CORS | A origem do site não está em `CORS_ORIGINS` (inclua a porta exata) |
| "Banco desatualizado" ao subir a API | Falta `alembic upgrade head` |
| Mudei `NEXT_PUBLIC_API_URL` e nada mudou | O valor vai para o build: `docker compose build frontend` |
| Login responde 429 | Limite de tentativas; espere 15 minutos |
| Link de e-mail não chega | Veja a caixa em http://localhost:8025 (e-mails de teste não saem da máquina) |

## 👥 Equipe
Projeto de extensão desenvolvido por estudantes de Engenharia de Software da Universidade de Vassouras - Campus Maricá:
- **Backend:** Felipe Sodré, Andrey Violante e Thiago Calvet
- **Frontend:** Cristian Barboza e Endriel Almeida

## 🚀 Deploy e Infraestrutura
A plataforma está projetada para rodar em um servidor VPS KVM (ex: Hostinger), assumindo o controle total sobre a infraestrutura:
- **Proxy Reverso e SSL:** Nginx com Let's Encrypt (Certbot).
- **Segurança de Servidor:** Acesso SSH exclusivo via chaves (sem root via senha) e Firewall UFW liberando apenas as portas 80 e 443 para a internet.
- **Integração Contínua:** Deploys automatizados gerenciados através do GitHub Actions.
- **Produção:** use `docker-compose.production.yml`, com `ENVIRONMENT=production`, `COOKIE_SECURE=true`, uma `SECRET_KEY` forte e SMTP próprio com STARTTLS.

## 💾 Políticas de Backup
A governança dos dados é garantida por Cron Jobs diários no servidor Linux, que realizam o `pg_dump` do banco de dados PostgreSQL e a compactação de arquivos multimídia de usuários para armazenamento seguro off-site.
