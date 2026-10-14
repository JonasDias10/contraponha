# Como contribuir com o Contraponha

Obrigado por contribuir. Este guia resume as convenções do projeto. Para configurar o ambiente, veja [docs/development/setup.md](docs/development/setup.md). Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

## Antes de começar

- Para mudanças pequenas (correções, textos, documentação), abra o PR direto.
- Para funcionalidades novas ou mudanças de arquitetura, abra uma issue antes e combine a abordagem. Isso evita trabalho que não vai entrar.
- Falhas de segurança não viram issue pública: siga o [SECURITY.md](SECURITY.md).

## Idiomas

| O quê                                                                              | Idioma                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Código: arquivos, pastas, classes, funções, variáveis, tabelas, colunas, endpoints | Inglês                                              |
| Comentários no código e em arquivos de configuração                                | Inglês                                              |
| Mensagens de log e de commit                                                       | Inglês                                              |
| Documentação para pessoas desenvolvedoras (README, `docs/`, este guia)             | pt-BR                                               |
| Textos exibidos para usuários                                                      | Catálogos de `@contraponha/i18n` (pt-BR como fonte) |

Use `User`, `Post`, `getUserById()`. Nunca `Usuario`, `Publicacao`, `buscarUsuario()`.

## Fluxo de trabalho

1. Crie uma branch a partir de `main`: `feat/<descricao-curta>` ou `fix/<descricao-curta>`.
2. Faça commits pequenos e atômicos seguindo [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`.
3. Antes de abrir o PR, rode:

   ```bash
   pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
   ```

   Mudanças de interface também rodam `pnpm test:browser` (fluxos do web e do hub e auditoria de acessibilidade).

4. Abra o PR explicando **por que** a mudança existe, não apenas o que mudou. Mudanças de arquitetura atualizam `docs/architecture/` no mesmo PR.

## Convenções de código

- **TypeScript estrito.** Sem `any` (use `unknown` e refine), sem `!` de non-null assertion, tipos de retorno explícitos em funções exportadas, `import type` para imports só de tipo.
- **Nomes.** Todo arquivo e pasta em `kebab-case`, componentes React inclusive (`health-report.ts`, `use-api-readiness.ts`, `verified-badge.tsx`). Arquivos de rota do Next.js e do Expo Router seguem a convenção do framework (`page.tsx`, `_layout.tsx`). Classes, componentes e tipos em `PascalCase`, funções e variáveis em `camelCase`, hooks começando com `use`, constantes reais em `SCREAMING_SNAKE_CASE`, booleanos com `is`/`has`/`can`.
- **Durações sempre com unidade no nome** (`SESSION_LAST_USED_WRITE_INTERVAL_MS`, `PASSWORD_RESET_TTL_MINUTES`) e definidas em `packages/config/src/time.ts` ou `apps/api/src/config/durations.ts`, usando as conversões (`minutesToMs(5)`, não `5 * 60 * 1000`).
- **Imports na API:** `./arquivo.js` só para a mesma pasta; o resto usa `#src/...`. Web e mobile usam `@/...`.
- **Funções com dois ou mais parâmetros recebem um único objeto** (`revoke({ userId, sessionId })`). Exceções e detalhes em [backend.md](docs/architecture/backend.md#estilo-de-código).
- **Tipos de parâmetro e de retorno declarados fora da assinatura** (`async set({ tokenHash, session }: SetCachedSessionParams)`), nunca como literal inline.
- **Nada de `await` como argumento:** guarde o resultado numa variável e use a variável.
- **Módulos organizados em pastas por camada** (`controllers/`, `services/`, `domain/`, `repositories/`, `infrastructure/`, `guards/`); na raiz do módulo, só o `<nome>.module.ts`.
- **`if` sem chaves por padrão** (`if (!user) return`); chaves só quando a instrução ocupa várias linhas.
- **Linhas em branco** antes e depois de todo `if`, de chamadas soltas e de declarações de várias linhas. O ESLint cobra e corrige com `pnpm lint:fix`.
- **Comentários** só quando o _porquê_ não é óbvio. Código autoexplicativo vem primeiro.
- **Sem código morto**, sem `TODO` solto. Trabalho futuro vai para uma issue ou para a documentação.
- **Funções pequenas e puras** sempre que possível; efeitos colaterais nas bordas (controllers, repositórios, clientes).
- **Duplicação:** lógica usada em dois lugares vira função compartilhada. Se for usada por API e clientes, vai para o pacote adequado em `packages/`.

## Backend

Leia [docs/architecture/backend.md](docs/architecture/backend.md). Os pontos mais cobrados em revisão:

- Controller sem regra de negócio; serviço sem detalhes de HTTP.
- Erros sempre via `AppError` com um `ApiErrorCode`. Nunca monte respostas de erro manualmente.
- Toda entrada validada com Zod (`ZodValidationPipe`).
- Um módulo não acessa tabelas de outro.
- Nada de `process.env` fora de `main.ts`/config; use o `AppConfig`.
- Logs sem dados pessoais, tokens ou segredos.

## Web e mobile

Leia [docs/architecture/frontends.md](docs/architecture/frontends.md). Nenhum texto de interface fica escrito direto no JSX: tudo passa por `t()` com chaves de `@contraponha/i18n`, nos três catálogos (`pt-BR`, `en` e `es`). Lógica usada pelos dois apps vai para um pacote compartilhado.

Acessibilidade faz parte da definição de pronto: siga as regras de [accessibility.md](docs/architecture/accessibility.md) e mantenha a auditoria do `pnpm test:browser` sem violações.

## Banco de dados

- Toda mudança de schema tem migration gerada com nome descritivo (`pnpm db:generate --name add_posts_table`).
- O SQL gerado é revisado no PR.
- Migrations já aplicadas não são editadas.

## Testes

- Teste comportamento observável (entrada e saída), não detalhes de implementação.
- Funções puras e transformações: testes unitários ao lado do arquivo.
- Serviços com banco: testes de integração contra PostgreSQL real, não mocks.
- Cubra os caminhos de erro (entrada inválida, recurso inexistente, dependência fora do ar).
- Cobertura é consequência, não meta.

## Segurança

- Nunca versione segredos. Se um segredo vazar no histórico, avise o time e rotacione imediatamente.
- Rotas novas passam pelo rate limiting global; endpoints sensíveis (login, cadastro) devem ter limites próprios.
- Uploads (quando existirem) validam tipo MIME e tamanho antes de chegar ao storage.

## Licença das contribuições

O Contraponha é distribuído sob a [AGPL-3.0](LICENSE). Ao enviar uma contribuição, você concorda que ela seja distribuída sob a mesma licença.
