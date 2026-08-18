<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Padrão visual (Brisk Connect)

Todas as telas seguem o visual do Brisk Connect (CRM/gestaobrisk): fundo `#f2f2f7`,
cabeçalho em gradiente azul-petróleo nas telas "hub" e cabeçalho azul (`#003DA6`)
com botão de voltar nas telas internas.

Use os componentes prontos em `components/AppHeader.tsx` em qualquer tela nova:

- `HubHeader` — cabeçalho em gradiente para telas hub (Dashboard, Cadastros, Comercial).
  Aceita `title`, `subtitle` e, opcionalmente, `backHref`/`backLabel`.
- `PageHeader` — cabeçalho azul compacto com botão de voltar, para telas internas
  (listas, formulários, detalhes). Props: `backHref`, `backLabel`.
- `ModuleGrid` — grade de cards coloridos (ícone + título + descrição) para telas hub.

Não recrie esse cabeçalho manualmente — importe os componentes e mantenha o
`<main>` com `style={{ minHeight: '100vh', background: '#f2f2f7' }}`.
