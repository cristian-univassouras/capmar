# Spec-Driven Development (SDD)

Bem-vindo à pasta de Especificações (SDD) do frontend! O Spec-Driven Development garante que pensemos nos requisitos, na arquitetura e na interface **antes** de escrever qualquer linha de código. 

Isso previne refatorações desnecessárias, alinha as expectativas de todos e serve como uma documentação viva do projeto.

## Estrutura de Pastas

- **/architecture**: Documentação de alto nível (escolhas de ferramentas, padrões de roteamento, estado global, etc).
- **/features**: Especificações de fluxos completos de usuários ou novas páginas (ex: `fluxo-de-login.md`, `dashboard-admin.md`).
- **/components**: Especificações para componentes isolados que possuam alta complexidade de UI/UX ou lógica (ex: `grafico-interativo.md`).

## Como criar uma nova Especificação (Spec)

1. Copie o arquivo `TEMPLATE.md` que está na raiz desta pasta.
2. Cole-o dentro da pasta correspondente (`features`, `components` ou `architecture`) com um nome descritivo (ex: `features/novo-checkout.md`).
3. Preencha as seções de acordo com os requisitos.
4. Revise com a equipe e, uma vez aprovada, inicie a codificação baseando-se estritamente na especificação!
