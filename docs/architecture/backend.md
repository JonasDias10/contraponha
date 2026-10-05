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
│   │   ├── errors/             AppError, catálogo de erros, filtro global
│   │   ├── validation/         ZodValidationPipe
│   │   ├── logging/            Configuração do Pino e request id
│   │   └── openapi/            Swagger e conversão Zod -> OpenAPI
│   ├── infrastructure/         Integrações técnicas (PostgreSQL, Redis)
│   └── modules/                Módulos de domínio
│       ├── health/             Primeiro módulo funcional
│       └── auth/, users/, ...  Planejados (README com a fronteira de cada um)
├── test/                       Testes e2e (Postgres e Redis reais)
├── vitest.config.ts            Testes unitários (src/**/*.test.ts)
└── vitest.e2e.config.ts        Testes e2e (test/**/*.e2e.test.ts)
```

## Camadas

Separação clara, sem cerimônia:

| Camada             | Onde vive                                                        | Responsabilidade                                                                                      |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Controller**     | `*.controller.ts`                                                | HTTP: rota, validação de entrada (pipe), documentação OpenAPI, status code. Nenhuma regra de negócio. |
| **Application**    | `*.service.ts`                                                   | Casos de uso: orquestra domínio e repositórios, define transações, lança `AppError`.                  |
| **Domain**         | arquivos sem sufixo de framework (`health-report.ts`, `post.ts`) | Regras puras: funções e tipos sem dependência de Nest, banco ou HTTP. Fáceis de testar.               |
| **Repository**     | `*.repository.ts`                                                | Acesso a dados com Drizzle. Recebe e devolve tipos do domínio, esconde SQL do serviço.                |
| **Infrastructure** | `src/infrastructure/` e `*.client.ts`                            | Clientes técnicos (banco, Redis, provedores externos).                                                |

O módulo `health` mostra a ideia em escala pequena:

```text
modules/health/
├── health.controller.ts     Controller: GET /health/live e /health/ready
├── health.service.ts        Application: executa os probes e decide 200 ou 503
├── health-report.ts         Domain: agrega o status (função pura, testada)
├── dependency-probe.ts      Infra: mede latência com timeout
└── health.module.ts
```

### O que evitamos

- **Interfaces "por boa prática".** Um repositório é uma classe concreta. Só criamos uma interface quando há mais de uma implementação real (por exemplo, storage de mídia com provedores diferentes).
- **Camadas vazias.** Se um caso de uso é só "buscar por id", o serviço chama o repositório e pronto. Não existe `UseCase` + `Interactor` + `Presenter` para isso.
- **Factories e herança desnecessárias.** Composição e funções puras primeiro.

### Como um módulo cresce

Exemplo de como `users` deve ficar quando for implementado:

```text
modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── user.ts                  Tipos e regras de domínio
├── users.schemas.ts         Schemas Zod de entrada (ou em @ponto/validation, se os clientes usarem)
└── users.service.test.ts
```

Quando um módulo ficar grande, ele pode ser dividido em subpastas (`domain/`, `application/`, `http/`, `infrastructure/`) sem mudar as regras acima.

## Regras de fronteira entre módulos

1. **Cada tabela tem um único módulo dono.** As tabelas ficam em `packages/database/src/schema/<modulo>.ts`, mas só o repositório do módulo dono as consulta.
2. **Módulos conversam por serviços exportados.** `posts` não importa `UsersRepository`; ele importa `UsersModule` e usa `UsersService`.
3. **Sem dependência circular.** Se dois módulos precisam um do outro, a regra provavelmente pertence a um terceiro módulo ou deve virar evento.
4. **`common/` não conhece domínio.** Se algo em `common/` começa a citar `posts` ou `users`, ele pertence ao módulo.

Essas regras são o que permite extrair um módulo para um serviço separado no futuro.

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

| Item                    | Implementação                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Headers de segurança    | `helmet()` com CSP padrão; `X-Powered-By` desativado.                                                                                           |
| CORS                    | Desligado por padrão. Liberado apenas para as origens de `CORS_ORIGINS`.                                                                        |
| Rate limiting           | `@nestjs/throttler` global por IP (`RATE_LIMIT_*`). Health checks são isentos. Use `@Throttle()` para limites específicos (por exemplo, login). |
| Proxy reverso           | `TRUST_PROXY` define quantos proxies são confiáveis, para obter o IP real com segurança.                                                        |
| Validação e sanitização | Zod em toda entrada; campos desconhecidos descartados.                                                                                          |
| Erros                   | Nunca expõem stack trace ou mensagem interna.                                                                                                   |
| Segredos                | Apenas via variáveis de ambiente; `.env` fora do git.                                                                                           |
| Logs                    | Redação de dados sensíveis (veja acima).                                                                                                        |
| Swagger                 | Desligado em produção por padrão (`SWAGGER_ENABLED`).                                                                                           |

**Rate limiting com várias instâncias:** hoje o contador fica em memória, o que é correto para uma instância. Ao escalar horizontalmente, troque o storage do `ThrottlerModule` por um baseado em Redis; o cliente Redis já está disponível via injeção (`REDIS`).

**Autenticação (próxima etapa):** o módulo `auth` fornecerá um guard global com decorator `@Public()` para rotas abertas. A ordem dos guards será: rate limit, depois autenticação, depois autorização. Os códigos `UNAUTHORIZED` e `FORBIDDEN` e suas mensagens já existem.

## Configuração

- `src/config/env.schema.ts` define e valida todas as variáveis com Zod.
- `loadAppConfig()` transforma o env em um objeto `AppConfig` tipado e agrupado (`http`, `database`, `redis`, `i18n`...).
- `main.ts` carrega a config **antes** de criar o app. Se falhar, imprime a lista de problemas e encerra com código 1.
- O `AppConfig` é injetado com `@Inject(APP_CONFIG)`. Não leia `process.env` fora de `main.ts`.

Para adicionar uma variável: inclua no schema, exponha no `AppConfig`, documente no `.env.example` e, se for usada no CI, no workflow.

## Infraestrutura (PostgreSQL e Redis)

- `DatabaseModule` (global) expõe a instância Drizzle pelo token `DATABASE` e fecha o pool no shutdown.
- `RedisModule` (global) expõe o cliente `ioredis` pelo token `REDIS` e fecha a conexão no shutdown.
- A API **sobe mesmo se PostgreSQL ou Redis estiverem fora**: o pool conecta sob demanda e o Redis reconecta sozinho. Quem decide se a instância recebe tráfego é o readiness check.

## Health checks

| Rota                       | Uso       | Comportamento                                                                                                                                                                  |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/health/live`  | Liveness  | 200 se o processo está respondendo. Não toca em dependências.                                                                                                                  |
| `GET /api/v1/health/ready` | Readiness | Faz `select 1` no PostgreSQL e `PING` no Redis (timeout de 2s cada). 200 se tudo estiver ok; 503 com envelope `SERVICE_UNAVAILABLE` e o relatório em `details` caso contrário. |

## Testes

- **Unitários** (`src/**/*.test.ts`, `pnpm test`): funções puras e peças isoladas (config, pipe de validação, agregação de health). Não precisam de Docker.
- **E2E** (`test/**/*.e2e.test.ts`, `pnpm test:e2e`): sobem o `AppModule` completo com PostgreSQL e Redis reais e fazem requisições HTTP. Cobrem envelope de erro, i18n, request id, rate limiting, headers de segurança, OpenAPI e health.

Testes de serviços com banco devem usar o PostgreSQL real, não mocks: mocks não detectam migrations quebradas nem SQL inválido.

O Vitest usa SWC (`unplugin-swc`) para emitir os metadados de decorators que a injeção de dependência do Nest exige.
