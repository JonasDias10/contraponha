# Setup de desenvolvimento

Guia para preparar o ambiente local, rodar a API e trabalhar com banco de dados e testes.

## Requisitos

| Ferramenta     | Versão                  | Observação                                                    |
| -------------- | ----------------------- | ------------------------------------------------------------- |
| Node.js        | 22.12 ou superior (LTS) | `nvm use` lê o `.nvmrc`                                       |
| pnpm           | 12                      | Instale via Corepack; a versão exata está em `packageManager` |
| Docker         | com Compose v2          | Docker Desktop, OrbStack, Colima ou Docker Engine             |
| Xcode          | atual                   | Só para o simulador iOS (macOS)                               |
| Android Studio | atual                   | Só para o emulador Android                                    |

```bash
nvm use            # opcional
corepack enable pnpm
pnpm -v
```

## 1. Instalar dependências

```bash
pnpm install
```

O pnpm só executa scripts de instalação de pacotes aprovados (`allowBuilds` em `pnpm-workspace.yaml`). Hoje são `@swc/core` e `esbuild`, que baixam binários nativos. Se um pacote novo precisar de script de instalação, aprove com `pnpm approve-builds <pacote>` e versione a alteração.

## 2. Variáveis de ambiente

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Cada app lê o env no lugar que o seu framework espera:

| Arquivo            | Lido por                       | Variáveis                |
| ------------------ | ------------------------------ | ------------------------ |
| `.env`             | API, drizzle-kit, e2e, Compose | banco, Redis, HTTP, i18n |
| `apps/web/.env`    | Next.js                        | `API_URL`                |
| `apps/mobile/.env` | Expo                           | `EXPO_PUBLIC_API_URL`    |

Os valores padrão já funcionam com o `docker-compose.yml`. O `.env` da raiz é lido por:

- a API em `pnpm dev` (via `node --env-file-if-exists`);
- o `drizzle-kit` (`pnpm db:*`);
- os testes e2e;
- o Docker Compose (portas e credenciais).

Em produção, as variáveis vêm do ambiente de execução, nunca de arquivo versionado.

## 3. PostgreSQL, Redis, Mailpit e RustFS

```bash
docker compose up -d       # sobe os serviços em segundo plano
docker compose ps          # todos devem aparecer como "healthy"
docker compose logs -f     # acompanhar logs
docker compose down        # parar (os dados ficam nos volumes)
docker compose down -v     # parar e apagar os dados
```

| Serviço    | Imagem               | Porta local             | Credenciais padrão                                 |
| ---------- | -------------------- | ----------------------- | -------------------------------------------------- |
| PostgreSQL | `postgres:18-alpine` | 5432                    | `contraponha` / `contraponha`, banco `contraponha` |
| Redis      | `redis:8-alpine`     | 6379                    | sem senha (apenas local)                           |
| Mailpit    | `axllent/mailpit`    | 1025 (SMTP), 8025 (web) | sem autenticação                                   |
| RustFS     | `rustfs/rustfs`      | 9000 (S3), 9001 (web)   | `contraponha` / `contraponha-local-secret`         |

O Mailpit recebe todos os e-mails enviados pela API em desenvolvimento (verificação de conta, redefinição de senha). Para ler, abra <http://localhost:8025>. Nada sai para a internet.

O RustFS é o storage compatível com S3 onde ficam as imagens dos posts. A API cria o bucket `contraponha-media` na inicialização (só fora de produção). O console fica em <http://localhost:9001>.

Se as portas já estiverem em uso, altere `POSTGRES_PORT`/`REDIS_PORT`/`STORAGE_PORT` no `.env` e ajuste `DATABASE_URL`/`REDIS_URL`/`STORAGE_ENDPOINT`/`MEDIA_PUBLIC_BASE_URL`.

## 4. Banco de dados

```bash
pnpm db:migrate                         # aplica migrations pendentes
pnpm db:generate --name add_users_table # gera migration a partir do schema
pnpm db:studio                          # interface web para inspecionar dados
pnpm db:reconcile-counters              # recalcula contadores (seguidores, reações, comentários)
```

Fluxo para alterar o schema:

1. Edite ou crie o arquivo do módulo em `packages/database/src/schema/` (por exemplo, `users.ts`) e exporte-o em `schema/index.ts`.
2. Rode `pnpm db:generate --name <descricao_em_ingles>`. Sempre dê um nome descritivo; o nome padrão é aleatório.
3. Revise o SQL gerado em `packages/database/migrations/`. Migrations são código: entram no PR e passam por revisão.
4. Rode `pnpm db:migrate`.

Regras:

- Nunca altere o banco manualmente nem edite uma migration já aplicada em outro ambiente. Crie uma nova.
- Nomes de tabelas e colunas em inglês, `snake_case`, tabelas no plural (`users`, `post_reactions`). No TypeScript, use `camelCase`; o Drizzle converte.

As tabelas atuais são `users`, `password_credentials`, `sessions` e `verification_tokens`. A estrutura e as regras de cada uma estão em [docs/architecture/auth.md](../architecture/auth.md).

O schema usa `uuidv7()`, função nativa do **PostgreSQL 18**. A imagem do docker-compose e o CI já usam essa versão.

## 5. Rodar a API e o web

```bash
pnpm dev
```

O comando compila os pacotes compartilhados, inicia o `tsc` em modo watch e reinicia o processo a cada compilação bem-sucedida. Erros de tipo aparecem no terminal e impedem o restart.

| URL                                       | O que é                        |
| ----------------------------------------- | ------------------------------ |
| http://localhost:3000/api/v1/health/live  | Liveness                       |
| http://localhost:3000/api/v1/health/ready | Readiness (PostgreSQL + Redis) |
| http://localhost:3000/api/docs            | Swagger UI                     |
| http://localhost:3000/api/docs-json       | Documento OpenAPI em JSON      |

Para rodar o build de produção localmente:

```bash
pnpm build
cd apps/api && node --env-file=../../.env build/main.js
```

O `pnpm dev` também sobe o web em <http://localhost:3001>. Para subir só um dos dois: `pnpm dev:api` ou `pnpm dev:web`.

### Mobile

```bash
pnpm dev:mobile
```

Abre o Expo CLI. Com ele rodando:

- `i` abre no simulador iOS (instala o Expo Go automaticamente na primeira vez);
- `a` abre no emulador Android;
- num aparelho físico, escaneie o QR code com o app Expo Go.

A URL da API depende de onde o app roda (veja os comentários em `apps/mobile/.env.example`): `localhost` funciona no simulador iOS, o emulador Android usa `10.0.2.2` e um aparelho físico precisa do IP do computador na rede local. Depois de alterar o `.env` do mobile, reinicie o Expo com `pnpm dev:mobile --clear`.

### Pacotes compartilhados durante o desenvolvimento

API, web e mobile consomem os pacotes compilados (`build/`). O `pnpm dev` compila tudo uma vez ao iniciar. Se você alterar um pacote em `packages/` com a API rodando, recompile-o:

```bash
pnpm --filter @contraponha/i18n build
```

## 6. Testes

```bash
pnpm test        # unitários, sem dependências externas
pnpm test:e2e    # e2e da API, exige `docker compose up -d`; usa o banco contraponha_test (criado e migrado automaticamente)
```

Para um pacote específico ou em modo watch:

```bash
pnpm --filter @contraponha/api test
pnpm --filter @contraponha/i18n exec vitest
```

Testes ficam ao lado do código (`foo.ts` e `foo.test.ts`). Os e2e da API ficam em `apps/api/test/`.

### Testes de navegador (web e hub)

`apps/browser-tests` usa Playwright para os fluxos de ponta a ponta (cadastro com o e-mail de confirmação lido do Mailpit, publicação, selo concedido no hub com verificação em duas etapas) e o axe para a auditoria de acessibilidade (WCAG 2.2 AA) das páginas principais, nos temas claro e escuro e numa tela de celular.

```bash
docker compose up -d
pnpm --filter @contraponha/browser-tests exec playwright install chromium   # uma vez
pnpm test:browser
```

O Playwright sobe API, web e hub em modo dev, com limites de requisição altos. Se eles já estiverem rodando, são reaproveitados com os limites do seu `.env`, e uma bateria seguida de testes pode esbarrar no limite de login; pare os servidores antes ou aumente `AUTH_RATE_LIMIT_MAX_REQUESTS` e `RATE_LIMIT_MAX_REQUESTS`. Os testes usam o banco de desenvolvimento e criam contas novas a cada execução.

Os fluxos do app mobile ficam em `apps/mobile/.maestro` (veja o README de lá).

## 7. Qualidade

```bash
pnpm lint          # ESLint com type-aware rules
pnpm typecheck     # tsc --noEmit em todos os pacotes
pnpm format        # Prettier (aspas duplas, sem ponto e vírgula)
pnpm format:check  # o que o CI executa
```

O CI (`.github/workflows/ci.yml`) roda quatro jobs em paralelo, e qualquer falha reprova o pipeline:

| Job       | O que faz                                                             |
| --------- | --------------------------------------------------------------------- |
| `quality` | `format:check`, `lint` e `typecheck`                                  |
| `test`    | testes unitários, migrations e e2e (único job com PostgreSQL e Redis) |
| `build`   | build de pacotes, API, web e bundles do mobile                        |
| `browser` | build, migrations e testes de navegador com Playwright e axe          |

A preparação comum (pnpm, Node, install e cache) fica na ação `.github/actions/setup`. Cada job guarda o cache do Turborepo (`.turbo/cache`) via `actions/cache`, então pacotes que não mudaram não são reprocessados nas execuções seguintes. Arquivos que afetam todos os pacotes (configs de TypeScript e ESLint) estão em `globalDependencies` no `turbo.json` e invalidam o cache inteiro quando mudam.

## Problemas comuns

**`Invalid environment configuration` ao iniciar a API.** Falta o `.env` ou alguma variável obrigatória. A mensagem lista cada variável com problema.

**Readiness responde 503.** O PostgreSQL ou o Redis não estão acessíveis. Rode `docker compose ps` e veja qual dependência está `down` no campo `details.checks` da resposta.

**`ERR_PNPM_IGNORED_BUILDS` no install.** Um pacote novo quer rodar script de instalação. Veja a seção 1.

**Porta 3000 ocupada.** Altere `PORT` no `.env`.

**Mudança em `packages/*` não aparece na API ou nos apps.** Recompile o pacote (veja a seção 5).

**Web mostra "API indisponível".** A API não está rodando, o readiness está em 503 ou `API_URL` em `apps/web/.env` aponta para o lugar errado.

**Mobile mostra "API indisponível" no Android ou num aparelho.** `localhost` aponta para o próprio aparelho. Use `10.0.2.2` (emulador) ou o IP da sua máquina (aparelho) em `EXPO_PUBLIC_API_URL`.
