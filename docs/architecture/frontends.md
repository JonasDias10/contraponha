# Frontends (apps/web e apps/mobile)

Os dois clientes do Contraponha compartilham contrato, traduções e cliente HTTP com a API. Este documento descreve a estrutura de cada um e as regras para manter o que é comum de fato comum.

## O que é compartilhado

| Necessidade                  | De onde vem                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| Chamar a API                 | `@contraponha/api-client` (`createApiClient`)                 |
| Tipos de resposta e erro     | `@contraponha/types`, validados por `@contraponha/validation` |
| Textos de interface          | `@contraponha/i18n` (namespace `app` e outros)                |
| Validar env na inicialização | `@contraponha/config` (`parseEnv`)                            |
| Lógica de cliente            | `@contraponha/client-core` e `@contraponha/client-core/react` |
| Regras de lint e TypeScript  | `@contraponha/eslint-config`, `@contraponha/tsconfig`         |

Regra prática: se a mesma lógica aparece no web e no mobile, ela sobe para um pacote. Exemplo: "a API está disponível?" é `health.isReady()` no `@contraponha/api-client`, e não um `try/catch` repetido em cada app.

### `@contraponha/client-core`

Tudo que os dois clientes fazem igual e não depende de plataforma:

- **`@contraponha/client-core`** (funções puras, seguras em Server Components): chaves do TanStack Query, regra de retry, formatação de datas e números, força de senha, máscara de data, janela de edição, textos de notificação e de reconhecimento, montagem do histórico de versões, schemas de formulário (compositor, perfil), filtros de busca, preferências de notificação e nomes dos idiomas.
- **`@contraponha/client-core/react`** (`"use client"`): hooks com mutations otimistas e invalidações (reações, salvar, fixar, excluir, seguir, preferências de notificação, interesses, onboarding, moderação). Eles leem a API, o tradutor e o toast de um `ClientContext` que cada app fornece; o web usa `sonner`, o mobile um toast nativo.

Os dois pontos de entrada existem porque o barrel puro é importado por Server Components do web, que não podem carregar `createContext` nem hooks.

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
    │   ├── (auth)/              Cadastro, login, senha e verificação de e-mail
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
├── .env.example                 EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WEB_URL
└── src/
    ├── app/                     Expo Router (rotas por arquivo)
    │   ├── _layout.tsx          Fontes, providers e guardas de sessão (Stack.Protected)
    │   ├── (auth)/              Boas-vindas, entrar, criar conta, esqueci a senha
    │   ├── onboarding.tsx       Interesses e sugestões de pessoas
    │   ├── reset-password.tsx   Link de redefinição (contraponha://reset-password?token=)
    │   ├── verify-email.tsx     Link de confirmação de e-mail
    │   └── (app)/               Abas (início, busca, escrever, notificações, perfil), post,
    │                            histórico, edição, perfis, seguidores, tópicos, salvos,
    │                            configurações e moderação
    ├── components/              Componentes nativos por área (post, discussion, composer, ui...)
    ├── hooks/                   Paleta do tema, upload de imagens, rascunho no aparelho
    ├── providers/               Preferências, sessão, idioma, toast e ClientContext
    └── lib/
        ├── polyfills.ts         Intl (plural, tempo relativo) e métodos de array que o Hermes não tem
        ├── session-token.ts     Token da sessão em memória, lido pelo cliente da API
        ├── storage.ts           expo-secure-store (token, tema, idioma)
        ├── paths.ts             Rotas tipadas e links de compartilhamento
        └── theme.ts             Tokens: paletas, tipografia, espaço, raio
```

- **Sessão.** O app chama a API direto com `Authorization: Bearer`. O token fica no `expo-secure-store` (Keychain no iOS, Keystore no Android) e em memória durante o uso. Uma resposta 401 a uma requisição autenticada encerra a sessão local e volta para a tela de entrada.
- **Navegação.** `Stack.Protected` separa quem não entrou, quem precisa concluir o onboarding e quem já está no app; não há redirecionamento manual.
- **Dados.** TanStack Query com as mesmas chaves e hooks de `@contraponha/client-core`, refetch ao voltar para o primeiro plano (`focusManager` + `AppState`) e listas com rolagem infinita e puxar para atualizar.
- **Idioma.** Escolha feita no app, depois o idioma da conta, depois o do aparelho. Trocar o idioma no app também atualiza a conta, para os e-mails seguirem. Os textos reaproveitam o namespace `web` de `@contraponha/i18n`.
- **Tema.** Automático, claro ou escuro, guardado no aparelho.
- **Markdown.** O corpo dos posts é escrito em Markdown com uma barra de formatação e prévia; a renderização usa o lexer do `marked` e componentes nativos, com o mesmo subconjunto do web (sem HTML bruto, links só `http(s)` e `mailto`).
- **Imagens.** `expo-image-picker` escolhe as fotos e o upload vai direto para o storage pela URL pré-assinada, como no web.
- **Rascunho.** O compositor salva o rascunho no aparelho (`AsyncStorage`), validado pelo mesmo schema antes de restaurar.
- **Textos legais** abrem no navegador do sistema a partir de `EXPO_PUBLIC_WEB_URL`, que também monta os links de compartilhamento.
- **Variáveis `EXPO_PUBLIC_*` são embutidas no bundle** e, portanto, públicas. Nunca coloque segredos nelas.
- **Projetos nativos gerados (CNG).** `ios/` e `android/` não são versionados; o Expo os gera a partir do `app.json` e dos plugins.
- O `bundleIdentifier`/`package` (`app.contraponha.mobile`) deve ser trocado pelo identificador definitivo antes da primeira publicação nas lojas.

### Rodando localmente

- `pnpm dev` na raiz sobe API e web; `pnpm --filter @contraponha/mobile dev` sobe o Metro.
- iOS: simulador com Expo Go (`i` no terminal do Expo). Android: emulador com Expo Go; rode `adb reverse tcp:3000 tcp:3000` (e `3001`, `9000`) para `localhost` funcionar de dentro do emulador, ou use `http://10.0.2.2:3000` no `.env`.
- Links de e-mail (confirmação, redefinição) apontam para o web; o app também aceita os mesmos caminhos pelo scheme `contraponha://` e passará a abrir os links `https` quando os universal links/app links forem configurados para o domínio de produção.

### Builds

- `pnpm build` executa `expo export` para iOS e Android: gera os bundles JavaScript (Hermes) em `apps/mobile/build/`. É o que o CI usa para garantir que o app empacota. O comando usa `--clear` de propósito: sem ele, o cache do Metro pode reaproveitar um valor antigo de `EXPO_PUBLIC_*` já embutido no bundle.
- Builds instaláveis (`.ipa`/`.aab`) e publicação nas lojas serão feitos com **EAS Build/Submit**, configurados quando houver a primeira distribuição interna.

## Fluxo de dados nos clientes

- web: TanStack Query, com prefetch no servidor (seção acima);
- mobile: o mesmo TanStack Query, sem prefetch no servidor; os dados chegam no primeiro render de cada tela, com estados de carregamento, erro e vazio.

## Testes

- **client-core:** Vitest para as funções puras compartilhadas (formatação, força de senha, máscara de data, textos de notificação). Fluxos completos são cobertos pelos testes e2e da API.
- **mobile:** ainda sem testes próprios; a base será Jest (`jest-expo`) + React Native Testing Library.
