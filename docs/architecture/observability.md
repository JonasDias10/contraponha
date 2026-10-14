# Observabilidade

Erros e desempenho vão para o **Sentry** nos quatro apps. Sem DSN configurado, nada é enviado: desenvolvimento local, CI e testes ficam silenciosos.

## O que é coletado

As opções comuns ficam em `sentryOptions` (`@contraponha/config`), usadas por API, web, hub e mobile:

- **Sem dados pessoais.** Nada de dados do usuário, cookies ou corpo de requisições (senhas, posts, mensagens). Dos cabeçalhos, só `user-agent`, `accept-language` e `content-type`.
- **Amostragem de performance** em 10% por padrão (`*_SENTRY_TRACES_SAMPLE_RATE`).
- **Ambiente** pela variável `*_SENTRY_ENVIRONMENT`, ou o `NODE_ENV`.

## Por app

| App     | Como entra                                                                                                                                                                                                                                     | Variáveis                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| API     | `src/instrument.ts`, carregado com `node --import` antes do app para instrumentar http, Express e pg; `SentryModule` no `AppModule`. Todo `logger.error` (falhas de requisição, jobs, e-mail, push) vira um evento pela integração com o pino. | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE` |
| Web/hub | `src/instrumentation.ts` (servidor, com `onRequestError`) e `src/instrumentation-client.ts` (navegador, com as transições de rota); `withSentryConfig` no `next.config.ts`.                                                                    | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`                        |
| Mobile  | `src/lib/sentry.ts`, importado no layout raiz, que é envolvido por `Sentry.wrap`; `metro.config.mjs` adiciona debug IDs aos bundles.                                                                                                           | `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`                        |

O DSN é público por natureza (vai no bundle do navegador e do app); não é segredo.

## Source maps

O envio de source maps só acontece quando o pipeline de deploy define `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`. Sem eles, os builds do Next pulam o envio, e o mobile usa as mesmas variáveis no EAS Build. O `@sentry/cli`, que faz o envio, está liberado em `allowBuilds` do `pnpm-workspace.yaml` porque baixa o binário na instalação.
