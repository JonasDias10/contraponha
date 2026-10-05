# Ponto

O Ponto é uma plataforma social brasileira feita para conversas que valem a pena. Em vez de otimizar o tempo de tela ou a quantidade de curtidas, o Ponto quer dar visibilidade a conteúdo relevante, bons argumentos e contribuições que fazem uma discussão avançar.

Este repositório contém a fundação técnica do produto: a API, o app web, o app mobile (iOS e Android), os pacotes compartilhados e a infraestrutura de desenvolvimento.

> **Estado atual:** fundação arquitetural. A API tem contas e autenticação completas (cadastro, login, sessões revogáveis, verificação de e-mail, redefinição e troca de senha, perfil), além de padrão de erros, logs, i18n e testes. O núcleo social também está pronto na API: posts (com janela de edição de 30 minutos e histórico), comentários com respostas, reações de qualidade e de concordância, e follows. Web e mobile consomem a API pelo cliente tipado e exibem uma tela inicial traduzida com o status da API; as telas de conta e de conteúdo vêm a seguir. Feed, moderação, busca e notificações são as próximas etapas.

## Filosofia

- **Qualidade acima de engajamento.** Cada decisão de produto e de ranking deve favorecer discussões melhores, não apenas mais cliques.
- **Simples agora, evolutivo depois.** Começamos com um monolito modular bem dividido. Escala horizontal, filas e serviços separados entram quando houver necessidade medida, não por antecipação.
- **Brasileiro desde a origem.** pt-BR é o idioma padrão, a LGPD é requisito de arquitetura e a infraestrutura de produção deve priorizar dados no Brasil.
- **Código em inglês, documentação em português.** Nomes de arquivos, tabelas, endpoints e identificadores são em inglês; documentação para pessoas desenvolvedoras é em pt-BR.

## Stack

| Camada           | Tecnologia                                    |
| ---------------- | --------------------------------------------- |
| Linguagem        | TypeScript 6 (ESM) sobre Node.js 22 LTS       |
| API              | NestJS 12 (Express), Swagger/OpenAPI          |
| Web              | Next.js 16 (App Router), React 19, Tailwind 4 |
| Mobile           | Expo SDK 57 (React Native 0.86), Expo Router  |
| Banco de dados   | PostgreSQL 18 com Drizzle ORM                 |
| Cache e filas    | Redis 8 (ioredis)                             |
| Autenticação     | Sessões opacas (Bearer), argon2id             |
| E-mail           | SMTP (nodemailer), Mailpit em desenvolvimento |
| Validação        | Zod 4, compartilhado entre API e clientes     |
| Logs             | Pino (JSON estruturado, `nestjs-pino`)        |
| Monorepo         | pnpm workspaces + Turborepo                   |
| Qualidade        | Vitest, ESLint (typescript-eslint), Prettier  |
| Infra local e CI | Docker Compose, GitHub Actions                |

## Arquitetura em uma página

```text
            ┌──────────────── clientes ──────────────┐
            │   apps/web (Next.js)  apps/mobile (Expo)│
            └──────────────┬─────────────────────────┘
                           │ @ponto/api-client (HTTP tipado)
                           ▼
┌──────────────────────── apps/api (NestJS) ────────────────────────┐
│  /api/v1/...                                                      │
│  common/  (erros, validação, logs, request id, OpenAPI)           │
│  modules/ (health hoje; auth, users, posts, feed... depois)       │
│  infrastructure/ (PostgreSQL via @ponto/database, Redis)          │
└───────────────────────────────────────────────────────────────────┘
        compartilhados: @ponto/types · @ponto/validation · @ponto/i18n · @ponto/config
```

A API é um **monolito modular**: um único deploy, dividido em módulos de domínio com fronteiras explícitas. Detalhes e justificativas em [docs/architecture/overview.md](docs/architecture/overview.md).

## Requisitos

- Node.js 22.12 ou superior (há um `.nvmrc`)
- pnpm 12 (via Corepack: `corepack enable pnpm`)
- Docker com Docker Compose v2
- Para o mobile: Xcode (simulador iOS) e/ou Android Studio (emulador), ou o app Expo Go num aparelho

## Primeiros passos

```bash
# 1. Dependências
corepack enable pnpm
pnpm install

# 2. Configuração local (API, web e mobile)
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env

# 3. PostgreSQL, Redis e Mailpit
docker compose up -d

# 4. Migrations
pnpm db:migrate

# 5. API e web em modo desenvolvimento
pnpm dev

# 6. Mobile (em outro terminal; abre o Expo CLI interativo)
pnpm dev:mobile
```

Com tudo no ar:

- Web: <http://localhost:3001>
- Liveness: <http://localhost:3000/api/v1/health/live>
- Readiness (PostgreSQL + Redis): <http://localhost:3000/api/v1/health/ready>
- Documentação OpenAPI: <http://localhost:3000/api/docs>
- E-mails enviados em desenvolvimento (Mailpit): <http://localhost:8025>

O passo a passo completo, com solução de problemas, está em [docs/development/setup.md](docs/development/setup.md).

## Configuração

Toda configuração vem de variáveis de ambiente. Cada app segue a convenção do seu framework: a API e o Docker Compose leem o [`.env`](.env.example) da raiz, o web lê [`apps/web/.env`](apps/web/.env.example) e o mobile lê [`apps/mobile/.env`](apps/mobile/.env.example). A API valida as variáveis na inicialização e encerra com uma mensagem objetiva se algo estiver ausente ou inválido:

```text
Invalid environment configuration:
  - DATABASE_URL: Invalid input: expected string, received undefined
```

Segredos nunca são versionados. O arquivo `.env` está no `.gitignore`.

## Comandos

Todos os comandos rodam a partir da raiz.

| Comando                      | O que faz                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                   | Sobe API e web em modo watch (compila os pacotes antes)                          |
| `pnpm dev:api`               | Só a API                                                                         |
| `pnpm dev:web`               | Só o web (porta 3001)                                                            |
| `pnpm dev:mobile`            | Expo CLI do mobile (`i` abre iOS, `a` abre Android)                              |
| `pnpm build`                 | Compila pacotes e apps (o mobile gera os bundles JS iOS/Android)                 |
| `pnpm test`                  | Testes unitários (não precisam de Docker)                                        |
| `pnpm test:e2e`              | Testes de integração da API contra PostgreSQL e Redis reais (banco `ponto_test`) |
| `pnpm lint`                  | ESLint com regras que usam informação de tipos                                   |
| `pnpm lint:fix`              | ESLint corrigindo automaticamente o que for possível                             |
| `pnpm typecheck`             | Verificação de tipos em todo o monorepo                                          |
| `pnpm format`                | Formata o código com Prettier                                                    |
| `pnpm format:check`          | Verifica a formatação (usado no CI)                                              |
| `pnpm db:generate`           | Gera uma migration a partir do schema Drizzle (`--name <nome>`)                  |
| `pnpm db:migrate`            | Aplica as migrations pendentes                                                   |
| `pnpm db:studio`             | Abre o Drizzle Studio                                                            |
| `pnpm db:reconcile-counters` | Recalcula contadores denormalizados a partir das linhas de origem                |
| `pnpm clean`                 | Remove artefatos de build e cache                                                |

## Estrutura do monorepo

```text
ponto/
├── apps/
│   ├── api/                  API NestJS
│   ├── mobile/               App iOS/Android (Expo)
│   └── web/                  App web (Next.js)
├── packages/
│   ├── api-client/           Cliente HTTP tipado para web e mobile
│   ├── config/               Constantes HTTP globais e parser de variáveis de ambiente
│   ├── database/             Drizzle, conexão, schema e migrations
│   ├── eslint-config/        Configuração compartilhada do ESLint
│   ├── i18n/                 Catálogos de mensagens, negociação de idioma e tradutor
│   ├── tsconfig/             Bases de tsconfig (library, node, nestjs, nextjs)
│   ├── types/                Tipos de contrato da API (sem regras de negócio)
│   └── validation/           Schemas Zod compartilhados
├── docs/
│   ├── architecture/         Visão geral, backend e i18n
│   └── development/          Setup e fluxo de desenvolvimento
├── .github/workflows/        CI
└── docker-compose.yml        PostgreSQL, Redis e Mailpit para desenvolvimento
```

## Documentação

- [Visão geral da arquitetura](docs/architecture/overview.md): monorepo, monolito modular, escolhas de stack, LGPD e evolução.
- [Backend](docs/architecture/backend.md): camadas, módulos, erros, logs, segurança e convenções.
- [Autenticação e contas](docs/architecture/auth.md): sessões, senhas, e-mails de conta e proteções contra abuso.
- [Conteúdo e relações](docs/architecture/content.md): posts, comentários, reações, follows, contadores e paginação.
- [Internacionalização](docs/architecture/i18n.md): como mensagens e idiomas funcionam.
- [Frontends](docs/architecture/frontends.md): web e mobile, e como usam os pacotes compartilhados.
- [Setup de desenvolvimento](docs/development/setup.md): ambiente local, testes e banco de dados.
- [Como contribuir](CONTRIBUTING.md).

## Contribuindo

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). Em resumo: branches curtas, commits convencionais, código em inglês, documentação em pt-BR e `pnpm lint && pnpm typecheck && pnpm test` passando antes de abrir um PR.
