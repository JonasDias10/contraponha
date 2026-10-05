# Frontends (apps/web e apps/mobile)

Os dois clientes do Ponto compartilham contrato, traduções e cliente HTTP com a API. Este documento descreve a estrutura de cada um e as regras para manter o que é comum de fato comum.

## O que é compartilhado

| Necessidade                  | De onde vem                                       |
| ---------------------------- | ------------------------------------------------- |
| Chamar a API                 | `@ponto/api-client` (`createApiClient`)           |
| Tipos de resposta e erro     | `@ponto/types`, validados por `@ponto/validation` |
| Textos de interface          | `@ponto/i18n` (namespace `app` e outros)          |
| Validar env na inicialização | `@ponto/config` (`parseEnv`)                      |
| Regras de lint e TypeScript  | `@ponto/eslint-config`, `@ponto/tsconfig`         |

Regra prática: se a mesma lógica aparece no web e no mobile, ela sobe para um pacote. Exemplo atual: "a API está disponível?" é `health.isReady()` no `@ponto/api-client`, e não um `try/catch` repetido em cada app.

Componentes visuais **não** são compartilhados. Web usa HTML + Tailwind e mobile usa componentes nativos + `StyleSheet`. Um pacote de UI compartilhado só faz sentido se, no futuro, adotarmos uma solução que renderize nos dois (por exemplo, React Native Web), e essa decisão ainda não foi tomada. O que é compartilhado visualmente são os **tokens de cor**, hoje definidos em `globals.css` (web) e `src/lib/theme.ts` (mobile) com os mesmos valores.

## apps/web (Next.js)

```text
apps/web/
├── next.config.ts
├── postcss.config.mjs           Tailwind 4
├── .env.example                 API_URL
└── src/
    ├── app/                     App Router
    │   ├── layout.tsx           <html lang>, metadata traduzida
    │   ├── page.tsx             Tela inicial (server component)
    │   └── globals.css          Tailwind e tokens de tema (claro/escuro)
    ├── components/              Componentes de apresentação
    └── lib/
        ├── api.ts               createServerApiClient(locale)
        ├── env.ts               Validação do env do web
        └── i18n.ts              Idioma da requisição a partir do Accept-Language
```

- **Server components por padrão.** A página inicial busca o status da API no servidor; nenhum JavaScript extra vai para o navegador. Componentes interativos usam `"use client"` só onde for necessário.
- **Idioma por requisição.** `getRequestTranslator()` negocia o idioma pelo `Accept-Language` com a mesma função que a API usa e define o `lang` do `<html>`.
- **`API_URL` é variável de servidor.** Como a chamada acontece no servidor, a URL não é exposta ao navegador. Quando houver chamadas do lado do cliente, crie `NEXT_PUBLIC_API_URL` e libere a origem do web em `CORS_ORIGINS` na API.
- **Rotas tipadas** (`typedRoutes`) fazem `<Link href>` inválido falhar no typecheck.
- Porta padrão: **3001** (a API usa a 3000).

## apps/mobile (Expo)

```text
apps/mobile/
├── app.json                     Nome, scheme, bundle id, plugins
├── .env.example                 EXPO_PUBLIC_API_URL
└── src/
    ├── app/                     Expo Router (rotas por arquivo)
    │   ├── _layout.tsx          Stack de navegação
    │   └── index.tsx            Tela inicial
    ├── components/
    ├── hooks/
    │   ├── use-api-readiness.ts Status da API com timeout e cancelamento
    │   └── use-translator.ts    Idioma do aparelho (expo-localization) -> t()
    └── lib/
        ├── api.ts               createMobileApiClient(locale)
        ├── env.ts               Validação do env do mobile
        └── theme.ts             Paletas clara/escura
```

- **Expo Router** organiza as telas por arquivo, como o App Router do web. Rotas tipadas estão ligadas (`experiments.typedRoutes`).
- **Idioma do aparelho.** `useTranslator()` lê as preferências do sistema com `expo-localization`, negocia com `negotiateLocale` e reage a mudanças de idioma.
- **Variáveis `EXPO_PUBLIC_*` são embutidas no bundle** e, portanto, públicas. Nunca coloque segredos nelas.
- **Projetos nativos gerados (CNG).** `ios/` e `android/` não são versionados; o Expo os gera a partir do `app.json` e dos plugins. Configuração nativa entra via config plugins.
- O `bundleIdentifier`/`package` (`app.ponto.mobile`) deve ser trocado pelo identificador definitivo antes da primeira publicação nas lojas.

### Builds

- `pnpm build` executa `expo export` para iOS e Android: gera os bundles JavaScript (Hermes) em `apps/mobile/build/`. É o que o CI usa para garantir que o app empacota. O comando usa `--clear` de propósito: sem ele, o cache do Metro pode reaproveitar um valor antigo de `EXPO_PUBLIC_*` já embutido no bundle.
- Builds instaláveis (`.ipa`/`.aab`) e publicação nas lojas serão feitos com **EAS Build/Submit**, configurados quando houver a primeira distribuição interna.

## Fluxo de dados nos clientes

Nesta etapa não há biblioteca de cache de dados. O status da API é buscado diretamente:

- web: no servidor, a cada requisição;
- mobile: num hook com `useEffect`, timeout de 3s e cancelamento ao desmontar.

Quando os clientes começarem a consumir dados de verdade (feed, perfis), a recomendação é adotar **TanStack Query** nos dois apps, com os hooks construídos sobre `@ponto/api-client`.

## Testes

Os apps ainda não têm testes próprios: toda a lógica atual vive nos pacotes compartilhados, que são testados. Quando surgirem componentes com comportamento (formulários, listas), a base será Vitest + Testing Library no web e Jest (`jest-expo`) + React Native Testing Library no mobile.
