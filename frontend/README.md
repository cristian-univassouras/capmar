# CapMar - Frontend 🎨

Este é o módulo frontend da CapMar. Ele atua como uma vitrine 24/7 rápida, otimizada para SEO e segura para os portfólios dos projetistas de Maricá, construído sobre o ecossistema **Next.js**.

## 🛠️ Tecnologias Utilizadas
- Next.js (React)
- Tailwind CSS / Styled Components
- DOMPurify (Sanitização de XSS em Rich Text)

## 🔒 Práticas de Segurança
O frontend não confia em dados não sanitizados e garante a proteção da sessão:
- **Gestão de Sessão (BFF):** A autenticação é feita trafegando tokens JWT exclusivamente em Cookies `HttpOnly` e `Secure`. O token nunca fica exposto no `localStorage`.
- **Security Headers:** Configurações rígidas de CSP (Content Security Policy), `X-Frame-Options` (contra Clickjacking) e HSTS dentro do arquivo `next.config.js`.

## 🚀 Como Rodar Localmente

1. Acesse o diretório do frontend:
```bash
cd frontend

2. Instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver o resultado. Se o projeto for iniciado em outra porta, o terminal exibirá o endereço correto.
