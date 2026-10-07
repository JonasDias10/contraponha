# Frontends (apps/web e apps/mobile)

Os dois clientes do Contraponha compartilham contrato, traduções e cliente HTTP com a API. Este documento descreve a estrutura de cada um e as regras para manter o que é comum de fato comum.

## O que é compartilhado

| Necessidade                  | De onde vem                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| Chamar a API                 | `@contraponha/api-client` (`createApiClient`)                 |
| Tipos de resposta e erro     | `@contraponha/types`, validados por `@contraponha/validation` |
| Textos de interface          | `@contraponha/i18n` (namespace `app` e outros)                |
| Validar env na inicialização | `@contraponha/config` (`parseEnv`)                            |
| Regras de lint e TypeScript  | `@contraponha/eslint-config`, `@contraponha/tsconfig`         |

Regra prática: se a mesma lógica aparece no web e no mobile, ela sobe para um pacote. Exemplo atual: "a API está disponível?" é `health.isReady()` no `@contraponha/api-client`, e não um `try/catch` repetido em cada app.

Componentes visuais **não** são compartilhados. Web usa HTML + Tailwind e mobile usa componentes nativos + `StyleSheet`. Um pacote de UI compartilhado só faz sentido se, no futuro, adotarmos uma solução que renderize nos dois (por exemplo, React Native Web), e essa decisão ainda não foi tomada. O que é compartilhado visualmente são os **tokens semânticos** (cores, fontes, raios e elevação), hoje definidos em `globals.css` (web) e `src/lib/theme.ts` (mobile) com os mesmos valores. Valores, regras de uso e justificativas estão em [docs/design/design-system.md](../design/design-system.md).

## apps/web (Next.js)

```text
apps/web/
├── next.config.ts
├── content/legal/               Termos, privacidade, diretrizes, transparência e "como funciona" (pt-BR, en, es)
├── .env.example                 API_URL
└── src/
    ├── app/                     App Router
    │   ├── layout.tsx           <html lang>, fontes, script de tema, providers
    │   ├── (site)/              Páginas públicas: landing e textos legais
    │   ├── (auth)/              Cadastro, login (senha ou link mágico), senha e verificação de e-mail
    │   ├── onboarding/          Escolha de tópicos e sugestões de pessoas
    │   ├── (app)/               Feed, post, perfil, seguidores, busca, notificações, salvos, configurações, moderação
    │   ├── (editor)/            Escrever e editar post
    │   └── api/v1/[...path]/    Proxy autenticado para a API (BFF)
    ├── actions/                 Server actions: entrar, sair, idioma
    ├── components/              Componentes por área (post, discussion, profile, ui...)
    ├── hooks/                   Mutations e estado de cliente (reações, seguir, upload, rascunho)
    └── lib/
        ├── api.ts               createServerApiClient(locale), com o token da sessão
        ├── api-browser.ts       Cliente do navegador, apontando para o proxy /api/v1
        ├── session.ts           Cookie httpOnly da sessão
        ├── viewer.ts            getViewer() e requireViewer(), cacheados por requisição
        ├── query-keys.ts        Chaves do TanStack Query, num lugar só
        ├── server-query.ts      QueryClient por requisição para prefetch
        ├── paths.ts             URLs tipadas das páginas
        └── i18n.ts              Idioma: cookie contraponha_locale, depois Accept-Language
```

### Sessão e chamadas à API

- **O token nunca chega ao JavaScript do navegador.** O login acontece numa server action, que guarda o token num cookie `contraponha_session` (`httpOnly`, `SameSite=Lax`, `Secure` em produção).
- **Server components** chamam a API direto, com `createServerApiClient`, que anexa o token como `Authorization: Bearer`.
- **Componentes de cliente** usam o mesmo `@contraponha/api-client` com `baseUrl` vazio: as chamadas vão para `/api/v1/...` no próprio web, e o route handler `app/api/v1/[...path]` repassa para `API_URL` com o token do cookie. Requisições que alteram estado só passam se a origem for a mesma (proteção contra CSRF além do `SameSite`).
- Por isso `API_URL` continua sendo variável de servidor e a API não precisa liberar CORS para o web. O CORS do bucket de mídia, por outro lado, precisa aceitar a origem do web, porque o upload vai direto do navegador para o storage (ver [media.md](media.md)).
- Páginas que exigem conta chamam `requireViewer()`, que redireciona para `/login`.

### Dados no cliente

- **TanStack Query** para tudo que é buscado ou alterado no cliente. Páginas fazem prefetch no servidor com `getServerQueryClient()` e entregam o cache com `HydrationBoundary`, então a primeira renderização já vem com dados e o cliente continua de onde parou (paginação infinita, mutations otimistas de reações, seguir e salvar).
- Todas as chaves ficam em `lib/query-keys.ts`; invalidações usam essas mesmas funções.
- Erros 4xx não são repetidos (`isRetryable`); só falhas de rede e 5xx.
- Listas de pessoas (seguidores, seguindo) pedem o estado "sigo ou não" de uma página inteira numa única chamada a `GET /follows/status?userIds=`, em vez de uma por linha.

### Formulários

`react-hook-form` com `zodResolver` e os **mesmos schemas** de `@contraponha/validation` que a API usa. Quando o schema transforma o valor (por exemplo, `trim` ou datas), o formulário declara os dois tipos: `useForm<Input, unknown, Output>`. Mensagens de erro vêm de `web.validation`.

### Interface

- Primitivos acessíveis do **Radix** (diálogos, menus, abas, popovers), variantes com `cva`, ícones `lucide-react`, toasts com `sonner`.
- Markdown de posts e contribuições renderizado com `react-markdown` num subconjunto seguro (sem HTML bruto); textos legais usam também `remark-gfm` para tabelas.
- Fontes Literata (texto) e Instrument Sans (interface) via `next/font`.
- **Tema** claro, escuro ou automático. Um script pequeno (`THEME_BOOT_SCRIPT`, em `lib/theme.ts`) roda antes da primeira pintura e aplica a classe `dark`, evitando o flash de tema errado. Substitui o `next-themes`, que gerava aviso de script no React 19.2.
- **Idioma.** O cookie `contraponha_locale` (seletor no rodapé ou idioma da conta) tem prioridade sobre o `Accept-Language`. Os textos estão no namespace `web` de `@contraponha/i18n`, em pt-BR, en e es. Textos legais traduzidos dizem que a versão em português prevalece.
- **Rotas tipadas** (`typedRoutes`) fazem `<Link href>` inválido falhar no typecheck; URLs dinâmicas são montadas em `lib/paths.ts`.
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
- O `bundleIdentifier`/`package` (`app.contraponha.mobile`) deve ser trocado pelo identificador definitivo antes da primeira publicação nas lojas.

### Builds

- `pnpm build` executa `expo export` para iOS e Android: gera os bundles JavaScript (Hermes) em `apps/mobile/build/`. É o que o CI usa para garantir que o app empacota. O comando usa `--clear` de propósito: sem ele, o cache do Metro pode reaproveitar um valor antigo de `EXPO_PUBLIC_*` já embutido no bundle.
- Builds instaláveis (`.ipa`/`.aab`) e publicação nas lojas serão feitos com **EAS Build/Submit**, configurados quando houver a primeira distribuição interna.

## Fluxo de dados nos clientes

- web: TanStack Query, com prefetch no servidor (seção acima);
- mobile: por enquanto só o status da API, num hook com `useEffect`, timeout de 3s e cancelamento ao desmontar. Quando o app consumir feed e perfis, a recomendação é adotar o mesmo TanStack Query sobre `@contraponha/api-client`.

## Testes

- **web:** Vitest para funções puras de `lib/` (formatação, edição de markdown, força de senha) e para a montagem de textos de notificação. Fluxos completos são cobertos pelos testes e2e da API.
- **mobile:** ainda sem testes próprios; a base será Jest (`jest-expo`) + React Native Testing Library.
