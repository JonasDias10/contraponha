# Backend (apps/api)

A API é uma aplicação NestJS organizada como monolito modular. Este documento descreve a estrutura, as camadas e os padrões transversais (erros, logs, request id, segurança, configuração).

## Estrutura

```text
apps/api/
├── src/
│   ├── main.ts                 Entrada: carrega config, cria o app, escuta a porta
│   ├── app.module.ts           Composição dos módulos
│   ├── app.setup.ts            Middlewares globais (Helmet, CORS, prefixo, versionamento, Swagger)
│   ├── config/                 Schema de env (Zod), AppConfig tipado, ConfigModule
│   ├── common/                 Peças transversais sem regra de domínio
│   │   ├── auth/               @Public(), @CurrentAuth() e o tipo AuthContext
│   │   ├── errors/             AppError, catálogo de erros, filtro global
│   │   ├── validation/         ZodValidationPipe
│   │   ├── logging/            Configuração do Pino e request id
│   │   ├── openapi/            Swagger e conversão Zod -> OpenAPI
│   │   └── rate-limit/         Limitadores padrão e estrito (@SensitiveRateLimit)
│   ├── infrastructure/         Integrações técnicas (PostgreSQL, Redis, e-mail)
│   └── modules/                Módulos de domínio
│       ├── health/             Liveness e readiness
│       ├── users/              Conta e perfil
│       ├── auth/               Credenciais, sessões, verificação de e-mail e senha
│       └── posts/, feed/, ...  Planejados (README com a fronteira de cada um)
├── test/                       Testes e2e (Postgres e Redis reais)
├── vitest.config.ts            Testes unitários (src/**/*.test.ts)
└── vitest.e2e.config.ts        Testes e2e (test/**/*.e2e.test.ts)
```

## Camadas

Separação clara, sem cerimônia:

Todo módulo segue a mesma estrutura de pastas. Na raiz fica apenas o `<nome>.module.ts`, que compõe as peças; todo o resto vive na pasta da sua camada, com o teste ao lado do arquivo testado:

| Pasta             | Camada         | Responsabilidade                                                                                      |
| ----------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `controllers/`    | Controller     | HTTP: rota, validação de entrada (pipe), documentação OpenAPI, status code. Nenhuma regra de negócio. |
| `services/`       | Application    | Casos de uso: orquestra domínio e repositórios, define transações, lança `AppError`.                  |
| `domain/`         | Domain         | Regras puras: funções e tipos sem dependência de Nest, banco ou HTTP. Fáceis de testar.               |
| `repositories/`   | Repository     | Acesso a dados com Drizzle. Recebe e devolve tipos do domínio, esconde SQL do serviço.                |
| `infrastructure/` | Infrastructure | Adaptadores técnicos do módulo (hash de senha, cache no Redis, probes).                               |
| `guards/`         | HTTP           | Guards do Nest que o módulo oferece.                                                                  |

Crie só as pastas que o módulo usa. Integrações técnicas compartilhadas por vários módulos (banco, Redis, e-mail) ficam em `src/infrastructure/`, fora dos módulos.

O módulo `health` mostra a ideia em escala pequena:

```text
modules/health/
├── health.module.ts
├── controllers/health.controller.ts        GET /health/live e /health/ready
├── services/health.service.ts              Executa os probes e decide 200 ou 503
├── domain/health-report.ts                 Agrega o status (função pura, testada)
└── infrastructure/dependency-probe.ts      Mede latência com timeout
```

### O que evitamos

- **Interfaces "por boa prática".** Um repositório é uma classe concreta. Só criamos uma interface quando há mais de uma implementação real (por exemplo, storage de mídia com provedores diferentes).
- **Camadas vazias.** Se um caso de uso é só "buscar por id", o serviço chama o repositório e pronto. Não existe `UseCase` + `Interactor` + `Presenter` para isso.
- **Factories e herança desnecessárias.** Composição e funções puras primeiro.

### Módulos de domínio

O módulo `users` é o exemplo de referência de um módulo de domínio completo:

```text
modules/users/
├── users.module.ts                         Exporta UsersService para outros módulos
├── controllers/users.controller.ts         GET/PATCH /users/me, GET /users/:handle
├── services/users.service.ts               Casos de uso; traduz violações de unicidade em AppError
├── repositories/users.repository.ts        Drizzle; aceita um executor para participar de transações
└── domain/user.ts                          Handles reservados, mapeamento para perfil público/privado
```

Os schemas de entrada ficam em `@ponto/validation` porque os formulários de web e mobile usam os mesmos.

O módulo `auth` é o maior até agora:

```text
modules/auth/
├── auth.module.ts
├── controllers/      auth.controller.ts, sessions.controller.ts
├── services/         auth.service.ts, sessions.service.ts, account-verification.service.ts
├── repositories/     credentials, sessions e verification-tokens
├── domain/           opaque-token.ts, account-emails.ts, account-links.ts
├── infrastructure/   password-hasher.ts, session-cache.ts
└── guards/           session-auth.guard.ts
```

O desenho está em [auth.md](auth.md).

## Estilo de código

Três regras valem em todo o monorepo e são verificadas pelo ESLint (`pnpm lint`, com correção automática da primeira via `pnpm lint:fix`):

- **Linha em branco antes e depois de todo `if`.**
- **Funções com dois ou mais parâmetros recebem um único objeto.** Os campos ficam nomeados na chamada (`revoke({ userId, sessionId })`) e a ordem dos argumentos deixa de importar. Ficam de fora as assinaturas impostas pelo framework: construtores (injeção de dependência), handlers de controller com parâmetros decorados, callbacks passados diretamente a outras funções (`.map((item, index) => ...)`) e métodos de interfaces do Nest, como `catch(exception, host)` do filtro de exceções, que usa `eslint-disable` com justificativa.
- **`await` não é usado como argumento.** O resultado vai primeiro para uma variável com nome e só então é usado:

  ```ts
  // avoid
  return toPrivateProfile(await this.usersService.getById(auth.userId))

  // prefer
  const user = await this.usersService.getById(auth.userId)
  return toPrivateProfile(user)
  ```

## Regras de fronteira entre módulos

1. **Cada tabela tem um único módulo dono.** As tabelas ficam em `packages/database/src/schema/<modulo>.ts`, mas só o repositório do módulo dono as consulta.
2. **Módulos conversam por serviços exportados.** `auth` não importa `UsersRepository`; ele importa `UsersModule` e usa `UsersService`.
3. **Transações atravessam módulos pelo executor.** Repositórios aceitam um `DatabaseExecutor` opcional (conexão ou transação). O cadastro, por exemplo, abre uma transação no `AuthService` e passa `tx` para `UsersService.create` e para o repositório de credenciais.
4. **Sem dependência circular.** Se dois módulos precisam um do outro, a regra provavelmente pertence a um terceiro módulo ou deve virar evento.
5. **`common/` não conhece domínio.** Se algo em `common/` começa a citar `posts` ou `users`, ele pertence ao módulo.

Essas regras são o que permite extrair um módulo para um serviço separado no futuro.

## Imports

A API usa **subpath imports** do Node (campo `imports` do `package.json`) em vez de caminhos relativos longos:

```ts
import { AppError } from "#src/common/errors/app-error.js" // instead of "../../common/errors/app-error.js"
import { SessionsService } from "./sessions.service.js" // same folder: relative
```

- `#src/*` aponta para `src/*` no TypeScript e nos testes (condição `source`, configurada em `customConditions` dos tsconfigs e em `ssr.resolve.conditions` do Vitest) e para `build/*` no Node em runtime. Nenhuma ferramenta de reescrita de caminhos é necessária no build.
- Regra: arquivos da **mesma pasta** usam `./arquivo.js`; qualquer outro arquivo de `src/` usa `#src/...`. Os testes em `test/` importam o código da API por `#src/...` e os próprios helpers por `./support/...`.
- O prefixo é `#src/` porque o Node 22 não aceita `#/` sozinho.
- Web e mobile usam o alias `@/` (resolvido pelo Next.js e pelo Metro). Os pacotes em `packages/` continuam com imports relativos: são pequenos e as declarações `.d.ts` publicadas ficam mais simples assim.

## Versionamento da API

Todas as rotas ficam sob `/api/v{n}`. O prefixo (`api`) e a versão padrão (`1`) são constantes em `@ponto/config`, usadas pela API e pelo `@ponto/api-client`, então não podem divergir.

Para introduzir uma versão nova de um endpoint, use `@Version("2")` no handler ou no controller. A v1 continua respondendo até ser descontinuada.

## Validação de entrada

A validação usa **Zod**, não `class-validator`. O motivo: os mesmos schemas podem ser usados pela API e pelos formulários de web e mobile (`@ponto/validation`).

```ts
@Post()
create(@Body(new ZodValidationPipe(createPostSchema)) body: CreatePostInput) { ... }
```

- Campos desconhecidos são descartados (comportamento padrão de `z.object`), o que impede _mass assignment_.
- Transformações como `trim()` acontecem no schema, antes do serviço.
- Uma falha vira `VALIDATION_FAILED` com `details` por campo (veja abaixo). Os valores enviados nunca são ecoados de volta.

Os schemas também alimentam a documentação OpenAPI via `toOpenApiSchema()`.

## Padrão de erros

Toda resposta de erro da API, sem exceção, tem este formato:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Alguns dados enviados são inválidos.",
    "details": [{ "path": "title", "code": "too_small" }],
    "requestId": "3f1c2d4e-8b7a-4c6d-9e0f-1a2b3c4d5e6f"
  }
}
```

| Campo       | Significado                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `code`      | Identificador estável em inglês (`ApiErrorCode` em `@ponto/types`). É nele que os clientes devem se basear. |
| `message`   | Texto para pessoas, traduzido conforme o `Accept-Language` da requisição (padrão pt-BR).                    |
| `details`   | Informação estruturada opcional (erros por campo, relatório de health). Sempre `null` em erros internos.    |
| `requestId` | O mesmo valor do header `X-Request-ID`, para suporte e correlação com logs.                                 |

Como funciona:

- `ERROR_CATALOG` (`common/errors/error-catalog.ts`) liga cada código a um status HTTP e a uma chave de i18n. O tipo `Record<ApiErrorCode, ...>` obriga todo código novo a ter status e mensagem.
- Serviços lançam `new AppError(ApiErrorCode.CONFLICT, { details })`. Eles nunca escrevem a mensagem final; a tradução acontece no filtro.
- O `AllExceptionsFilter` captura tudo: `AppError`, exceções HTTP do Nest (rota inexistente, JSON malformado, rate limit) e erros inesperados.
- Erros inesperados viram `INTERNAL_ERROR` (500) com mensagem genérica. Stack trace e mensagem original vão **apenas para o log**, em qualquer ambiente.
- A resposta inclui `Content-Language` com o idioma usado.

Para adicionar um código novo: inclua-o em `ApiErrorCode` (`@ponto/types`), crie a mensagem em `@ponto/i18n` e registre no `ERROR_CATALOG`. O `typecheck` aponta o que faltar.

## Logs

Logs estruturados em JSON com **Pino** (`nestjs-pino`). Em desenvolvimento, são formatados com `pino-pretty` para leitura humana.

Cada linha contém, quando aplicável:

- `time` (ISO 8601), `level` (texto: `info`, `warn`, `error`...)
- `service`, `env`
- `requestId`, presente em todo log emitido durante uma requisição
- `context` (classe/módulo que gerou o log)
- `err` com tipo, mensagem e stack, em logs de erro

Exemplo de produção:

```json
{
  "level": "warn",
  "time": "2026-10-05T13:00:00.731Z",
  "service": "ponto-api",
  "env": "production",
  "requestId": "163fb39c-...",
  "req": { "id": "163fb39c-...", "method": "GET", "path": "/api/v1/x" },
  "res": { "statusCode": 404 },
  "responseTime": 1,
  "msg": "request completed"
}
```

O que **não** é registrado:

- corpo de requisição e resposta;
- query string (pode conter tokens);
- headers (incluindo `Authorization` e `Cookie`);
- campos com nomes sensíveis (`password`, `token`, `accessToken`, `refreshToken`, `secret`, `authorization`, `cookie`) em qualquer objeto logado, que são substituídos por `[REDACTED]`.

Níveis por resposta: 5xx em `error`, 4xx em `warn`, demais em `info`. As rotas de health não geram log de acesso, para não poluir os logs com probes.

Para observabilidade: como a saída é JSON em stdout, qualquer coletor (Grafana Loki, Datadog, Elastic, CloudWatch, OpenTelemetry Collector) consome sem mudança no código. Tracing distribuído pode ser adicionado depois com OpenTelemetry, reaproveitando o `requestId`.

Ao escrever logs no código, use o `Logger` do Nest com objeto estruturado primeiro:

```ts
private readonly logger = new Logger(PostsService.name)

this.logger.warn({ postId }, "Post exceeded edit window")
this.logger.error({ err: error }, "Failed to publish post")
```

Mensagens de log são sempre em inglês e **não** passam por i18n.

## Request ID

- Header: `X-Request-ID`.
- Política: se o cliente enviar um valor válido (8 a 128 caracteres, apenas `A-Z a-z 0-9 . _ : -`), ele é reaproveitado. Isso permite correlacionar com um gateway ou com o app. Caso contrário, a API gera um UUID v4.
- A validação impede injeção de quebras de linha ou valores enormes nos logs.
- O valor volta no header de resposta (exposto via CORS), aparece em todo log da requisição e no campo `requestId` dos erros.

## Segurança

| Item                    | Implementação                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headers de segurança    | `helmet()` com CSP padrão; `X-Powered-By` desativado.                                                                                                           |
| CORS                    | Desligado por padrão. Liberado apenas para as origens de `CORS_ORIGINS`.                                                                                        |
| Autenticação            | Guard global de sessão (Bearer). Rotas abertas precisam de `@Public()`. Detalhes em [auth.md](auth.md).                                                         |
| Rate limiting           | `@nestjs/throttler` global por IP (`RATE_LIMIT_*`) e um limitador estrito (`AUTH_RATE_LIMIT_*`) ativado com `@SensitiveRateLimit()`. Health checks são isentos. |
| Proxy reverso           | `TRUST_PROXY` define quantos proxies são confiáveis, para obter o IP real com segurança.                                                                        |
| Validação e sanitização | Zod em toda entrada; campos desconhecidos descartados.                                                                                                          |
| Erros                   | Nunca expõem stack trace ou mensagem interna.                                                                                                                   |
| Segredos                | Apenas via variáveis de ambiente; `.env` fora do git.                                                                                                           |
| Logs                    | Redação de dados sensíveis (veja acima).                                                                                                                        |
| Swagger                 | Desligado em produção por padrão (`SWAGGER_ENABLED`).                                                                                                           |

**Rate limiting com várias instâncias:** hoje o contador fica em memória, o que é correto para uma instância. Ao escalar horizontalmente, troque o storage do `ThrottlerModule` por um baseado em Redis; o cliente Redis já está disponível via injeção (`REDIS`).

**Ordem dos guards:** rate limit, depois sessão. Assim, tentativas de força bruta são barradas antes de qualquer consulta ao banco. Autorização (papéis, moderação) entrará depois da sessão.

**Protegido por padrão:** uma rota nova sem `@Public()` exige sessão. Esquecer o decorator gera um 401 visível no primeiro teste, nunca uma rota aberta por engano.

## Durações

Nenhum número de tempo fica solto no código. Toda duração tem nome com a unidade no sufixo (`_MS`, `_SECONDS`, `_MINUTES`, `_HOURS`, `_DAYS`) e mora num arquivo compartilhado:

| Arquivo                            | Conteúdo                                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/config/src/time.ts`      | Conversões (`secondsToMs`, `minutesToMs`, `hoursToMs`, `daysToMs`, `msToSeconds`) e durações usadas por mais de um app ou pacote (`API_READINESS_TIMEOUT_MS`, timeouts padrão do PostgreSQL) |
| `apps/api/src/config/durations.ts` | Durações da API: timeouts de health e Redis, cache e atualização de sessão, validade dos links de conta                                                                                      |

Durações configuráveis por ambiente seguem a mesma regra no nome da variável (`RATE_LIMIT_TTL_SECONDS`, `SESSION_TTL_DAYS`) e são convertidas para milissegundos uma única vez, em `loadAppConfig()`. Dentro do código, campos e parâmetros também carregam a unidade (`ttlMs`, `timeoutMs`).

## Configuração

- `src/config/env.schema.ts` define e valida todas as variáveis com Zod.
- `loadAppConfig()` transforma o env em um objeto `AppConfig` tipado e agrupado (`http`, `database`, `redis`, `i18n`...).
- `main.ts` carrega a config **antes** de criar o app. Se falhar, imprime a lista de problemas e encerra com código 1.
- O `AppConfig` é injetado com `@Inject(APP_CONFIG)`. Não leia `process.env` fora de `main.ts`.

Para adicionar uma variável: inclua no schema, exponha no `AppConfig`, documente no `.env.example` e, se for usada no CI, no workflow.

## Infraestrutura (PostgreSQL, Redis e e-mail)

- `DatabaseModule` (global) expõe a instância Drizzle pelo token `DATABASE` e fecha o pool no shutdown.
- `RedisModule` (global) expõe o cliente `ioredis` pelo token `REDIS` e fecha a conexão no shutdown.
- `EmailModule` (global) expõe `EmailSender`, implementado por `SmtpEmailSender` (nodemailer). Qualquer provedor com SMTP serve; em desenvolvimento, o Mailpit do docker-compose recebe tudo. É uma das poucas abstrações com classe abstrata, porque há duas implementações reais (SMTP e o capturador dos testes) e o provedor muda por ambiente.
- A API **sobe mesmo se PostgreSQL ou Redis estiverem fora**: o pool conecta sob demanda e o Redis reconecta sozinho. Quem decide se a instância recebe tráfego é o readiness check.

## Health checks

| Rota                       | Uso       | Comportamento                                                                                                                                                                  |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/health/live`  | Liveness  | 200 se o processo está respondendo. Não toca em dependências.                                                                                                                  |
| `GET /api/v1/health/ready` | Readiness | Faz `select 1` no PostgreSQL e `PING` no Redis (timeout de 2s cada). 200 se tudo estiver ok; 503 com envelope `SERVICE_UNAVAILABLE` e o relatório em `details` caso contrário. |

## Testes

- **Unitários** (`src/**/*.test.ts`, `pnpm test`): funções puras e peças isoladas (config, pipe de validação, agregação de health). Não precisam de Docker.
- **E2E** (`test/**/*.e2e.test.ts`, `pnpm test:e2e`): sobem o `AppModule` completo com PostgreSQL e Redis reais e fazem requisições HTTP. Cobrem envelope de erro, i18n, request id, rate limiting, headers de segurança, OpenAPI, health, e todos os fluxos de auth e users.
  - Rodam num banco separado, `<nome>_test` (por exemplo, `ponto_test`). O `test/global-setup.ts` cria o banco se não existir, aplica as migrations com o migrator programático e limpa as tabelas antes da execução.
  - O `EmailSender` é trocado por `CapturingEmailSender`, que guarda as mensagens em memória; os testes leem os links de verificação e redefinição a partir dele.
  - Cada teste cria contas com e-mail e handle aleatórios (`test/support/accounts.ts`), então os testes não dependem de ordem.

Testes de serviços com banco devem usar o PostgreSQL real, não mocks: mocks não detectam migrations quebradas nem SQL inválido.

O Vitest usa SWC (`unplugin-swc`) para emitir os metadados de decorators que a injeção de dependência do Nest exige.
