# CapMar - Backend ⚙️

Este é o cérebro da plataforma CapMar. Uma API RESTful de alta performance projetada para lidar com autenticação, cadastros, upload de portfólios e comunicação com o banco de dados.

## 🛠️ Tecnologias Utilizadas
- **Linguagem:** Python 3.10+
- **Framework Web:** FastAPI
- **Servidor ASGI:** Uvicorn
- **ORM:** SQLAlchemy
- **Validação de Dados:** Pydantic
- **Banco de Dados:** MySQL

## 🔒 Segurança e Tratamento de Dados
Este backend foi construído com as melhores práticas de Engenharia de Software:
- **Proteção contra Injeção SQL:** Todas as interações com o banco MySQL passam pelo ORM SQLAlchemy.
- **Validação Rígida:** Todos os *payloads* de entrada (como criação de usuários e envios de projetos) são exaustivamente validados pelas rotas utilizando modelos Pydantic.
- **Rate Limiting:** Implementação de limite de requisições por IP (ex: via `slowapi`) para mitigar ataques DDoS e força bruta em rotas de autenticação.

## 🚀 Como Rodar Localmente

1. Acesse o diretório do backend:
```bash
cd backend