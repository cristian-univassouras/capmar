# CapMar 🌊

A CapMar é uma plataforma web desenvolvida para aumentar a visibilidade de pequenos e médios projetistas e microempreendedores da cidade de Maricá, conectando seus projetos a potenciais investidores e apoiadores locais.

## 🏗️ Arquitetura do Projeto
Este repositório está dividido em dois módulos principais. Recomendamos fortemente a adoção do padrão GitFlow (`main`, `develop`, `feature/*`) para o versionamento do código.

- [**Frontend**](./frontend/README.md): A interface do usuário desenvolvida em Next.js.
- [**Backend**](./backend/README.md): A API RESTful e lógica de negócios desenvolvida em Python / FastAPI com banco de dados PostgreSQL.

## 👥 Equipe
Projeto de extensão desenvolvido por estudantes de Engenharia de Software da Universidade de Vassouras - Campus Maricá:
- **Backend:** Felipe Sodré e Andrey Violante
- **Frontend:** Cristian Barboza e Endriel Almeida

## 🚀 Deploy e Infraestrutura
A plataforma está projetada para rodar em um servidor VPS KVM (ex: Hostinger), assumindo o controle total sobre a infraestrutura:
- **Proxy Reverso e SSL:** Nginx com Let's Encrypt (Certbot).
- **Segurança de Servidor:** Acesso SSH exclusivo via chaves (sem root via senha) e Firewall UFW liberando apenas as portas 80 e 443 para a internet.
- **Integração Contínua:** Deploys automatizados gerenciados através do GitHub Actions.

## 💾 Políticas de Backup
A governança dos dados é garantida por Cron Jobs diários no servidor Linux, que realizam o `mysqldump` do banco de dados e a compactação de arquivos multimídia de usuários para armazenamento seguro off-site.