# Visão geral da arquitetura

Este documento registra as decisões estruturais do Contraponha e o motivo de cada uma. Quando uma decisão mudar, atualize este arquivo no mesmo PR.

## Princípios

| Agora       | Depois               |
| ----------- | -------------------- |
| Simples     | Escalável            |
| Confiável   | Distribuído          |
| Manutenível | Altamente disponível |
| Testável    |                      |
| Seguro      |                      |

A coluna da esquerda guia as decisões de hoje. A da direita não é ignorada: nenhuma escolha atual deve impedir chegar lá, mas também não pagamos hoje o custo de uma infraestrutura que ainda não precisamos.

## Por que monorepo

O Contraponha terá API, web e apps iOS/Android, e todos falam o mesmo "idioma" de contrato: tipos de resposta, códigos de erro, regras de validação e mensagens traduzidas. Em repositórios separados, esses contratos viram cópias que divergem com o tempo.

No monorepo:

- Uma mudança de contrato (por exemplo, um novo campo obrigatório) aparece no mesmo PR para API e clientes, e o `typecheck` acusa quem ficou para trás.
- Pacotes compartilhados (`@contraponha/types`, `@contraponha/validation`, `@contraponha/i18n`) são consumidos via `workspace:*`, sem publicar versões em registry.
- O Turborepo executa só o que foi afetado e guarda cache de build, lint e testes.

**pnpm** foi escolhido por instalar dependências de forma estrita (um pacote só enxerga o que declara) e pelo suporte nativo a workspaces.

## Por que monolito modular

Microserviços resolvem problemas de organizações grandes: deploys independentes, times autônomos, escala de partes isoladas. Hoje eles só trariam custo: rede entre serviços, consistência distribuída, observabilidade mais difícil e mais infraestrutura para operar.

O monolito modular dá o melhor dos dois mundos nesta fase:

- **Um deploy, um processo, um banco.** Transações locais, depuração simples, latência mínima.
- **Fronteiras explícitas.** Cada domínio (`users`, `posts`, `feed`...) é um módulo NestJS com sua própria API interna. Um módulo não lê as tabelas de outro diretamente; ele usa o serviço exportado pelo dono.
- **Caminho de extração aberto.** Se um módulo precisar escalar de forma independente (o `feed`, por exemplo), as fronteiras já existem. A extração vira uma troca de chamada local por chamada remota ou evento, sem reescrever o domínio.

As regras práticas de fronteira estão em [backend.md](backend.md).

## Por que TypeScript

- Um único idioma em API, web e mobile (React Native), o que permite compartilhar tipos, validação e i18n de verdade, não apenas por convenção.
- Tipagem estrita (`strict`, `noUncheckedIndexedAccess`, lint com informação de tipos) pega classes inteiras de erro antes de produção.
- Ecossistema maduro para todas as peças da stack (NestJS, Drizzle, Zod, Pino).

O projeto é **ESM** de ponta a ponta (`"type": "module"`, `module: nodenext`), alinhado ao NestJS 12 e ao ecossistema atual. Imports relativos usam a extensão `.js`, como exige o Node.

## Por que PostgreSQL

O núcleo de uma rede social é relacional: usuários seguem usuários, posts têm comentários, reações apontam para posts. O PostgreSQL oferece:

- Integridade referencial e transações, essenciais para exclusão e anonimização consistentes (LGPD).
- Recursos que adiam a necessidade de serviços extras: full-text search, `pg_trgm`, JSONB, índices parciais, particionamento.
- Disponibilidade em praticamente todos os provedores de nuvem, inclusive em regiões no Brasil.

**Drizzle ORM** foi escolhido por ser fino (o SQL gerado é previsível), totalmente tipado e por gerar migrations SQL legíveis e revisáveis. O schema usa `casing: snake_case`: no TypeScript escrevemos `createdAt`, no banco a coluna é `created_at`.

## Por que Redis

O Redis entra desde já porque vários requisitos próximos dependem dele:

- **Rate limiting distribuído**, quando a API tiver mais de uma instância.
- **Sessões e tokens de curta duração** do módulo `auth`.
- **Contadores** de alta frequência (reações, visualizações), consolidados depois no PostgreSQL.
- **Feeds materializados** e cache de leitura.
- **Filas e jobs assíncronos** (notificações, processamento de mídia).

Nesta etapa existe apenas o cliente configurado, com encerramento gracioso e verificação no health check. Nenhum cache foi implementado antes de haver o que cachear.

## Pacotes compartilhados

| Pacote                       | Responsabilidade                                                                                                              | Quem consome                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `@contraponha/types`         | Tipos de contrato (envelope de erro, códigos, relatórios de health)                                                           | todos                           |
| `@contraponha/validation`    | Schemas Zod dos contratos e utilitários de validação                                                                          | API, api-client, apps           |
| `@contraponha/i18n`          | Idiomas suportados, catálogos, negociação de idioma, `t()`                                                                    | API, apps                       |
| `@contraponha/config`        | Constantes HTTP globais (prefixo, versão, header de request id), parser de env, conversões de tempo e durações compartilhadas | API, api-client, database, apps |
| `@contraponha/api-client`    | Cliente HTTP tipado da API                                                                                                    | web, mobile                     |
| `@contraponha/database`      | Conexão, schema e migrations                                                                                                  | somente a API                   |
| `@contraponha/tsconfig`      | Bases de configuração do TypeScript                                                                                           | todos                           |
| `@contraponha/eslint-config` | Regras de lint                                                                                                                | todos                           |

Regras para manter os pacotes saudáveis:

- `types` não contém lógica. `validation` não contém regra de negócio, apenas formato de dados.
- `config` só recebe algo que seja realmente global e usado por mais de um pacote. Constante de um módulo fica no módulo.
- `database` não é importado por clientes (web/mobile). Ele depende de `pg` e só faz sentido no servidor.
- Os pacotes de biblioteca (`types`, `validation`, `i18n`, `config`, `api-client`) não dependem de APIs do Node e funcionam em browser e React Native.

Cada pacote compila para `build/` com `tsc` (JavaScript ESM + declarações `.d.ts`). O Turborepo garante que dependências sejam compiladas antes de quem as consome.

## Apps clientes: web e mobile

```text
apps/
  api/       NestJS
  web/       Next.js 16 (App Router) + Tailwind
  mobile/    Expo SDK 57 + Expo Router (iOS e Android)
```

- **Web com Next.js** porque posts e perfis públicos precisam ser indexáveis por buscadores e gerar preview quando um link é compartilhado. Isso exige renderização no servidor.
- **Mobile com Expo** porque é o caminho recomendado pelo próprio React Native: builds iOS/Android na nuvem (EAS), atualizações over-the-air e projetos nativos gerados sob demanda (`ios/` e `android/` não são versionados).

Os dois apps importam o mesmo cliente (`@contraponha/api-client`, que valida as respostas com os schemas de `@contraponha/validation`), os mesmos catálogos de tradução (`@contraponha/i18n`) e o mesmo parser de env (`@contraponha/config`). A única lógica de rede que cada app tem é a criação do cliente com a URL da API. Detalhes em [frontends.md](frontends.md).

Para adicionar outro app (um painel administrativo, por exemplo):

1. Criar `apps/<nome>` com `package.json` próprio. O `pnpm-workspace.yaml` já inclui `apps/*`.
2. Depender dos pacotes compartilhados via `workspace:*`.
3. Estender a base de `@contraponha/tsconfig` adequada e uma das configs de `@contraponha/eslint-config` (`nodeConfig`, `reactConfig` ou `nextConfig`).
4. Definir as tarefas `build`, `dev`, `lint`, `typecheck` e `test`. O `turbo.json` não precisa mudar.

## LGPD e privacidade

O Contraponha tratará dados pessoais de brasileiros, então a LGPD orienta a arquitetura desde o início. Nesta etapa nada disso está implementado, mas as decisões abaixo evitam bloqueios futuros:

| Requisito                           | Preparação atual / plano                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exclusão e anonimização             | Um módulo é dono de cada tabela; o módulo `users` orquestrará exclusão/anonimização chamando os donos. Chaves estrangeiras explícitas no PostgreSQL; credenciais, sessões e tokens já são apagados em cascata com a conta. |
| Exportação de dados (portabilidade) | Mesma regra de propriedade: cada módulo saberá exportar os dados que guarda.                                                                                                                                               |
| Auditoria e ações administrativas   | O módulo `moderation` mantém trilha de auditoria append-only que sobrevive à exclusão de contas (ver [moderation.md](moderation.md)).                                                                                      |
| Consentimentos                      | Serão registrados com versão do termo e data, em módulo próprio, quando houver coleta.                                                                                                                                     |
| Retenção                            | Políticas por tipo de dado, executadas por jobs assíncronos (Redis).                                                                                                                                                       |
| Controle de acesso                  | Guard global de sessão: toda rota exige autenticação, salvo `@Public()`. Sessões revogáveis na hora. Papéis `member`, `moderator` e `admin` protegem as rotas de moderação.                                                |
| Logs                                | Logs não registram corpo de requisição, query string, senhas, tokens, cookies nem headers de autorização.                                                                                                                  |

Esses requisitos serão tratados em módulos próprios quando as funcionalidades que coletam dados forem implementadas.

## Dados no Brasil e independência de provedor

A produção deverá priorizar armazenamento e processamento no Brasil. Para que isso seja uma escolha de deploy, e não uma reescrita:

- Banco e cache são acessados por URLs padrão (`DATABASE_URL`, `REDIS_URL`), compatíveis com qualquer Redis e com PostgreSQL 18 ou superior (o schema usa `uuidv7()` nativo), gerenciado ou próprio.
- Serviços externos ficam atrás de interfaces da própria aplicação. A mídia usa `ObjectStorage` sobre o protocolo S3 (o SDK da AWS serve apenas como cliente do protocolo), que existe em vários provedores com região no Brasil; e-mail é SMTP.
- A API é um processo Node sem estado local; pode rodar em VM, container ou plataforma gerenciada.

## Ajustes em relação à estrutura inicial proposta

- **`infra/docker/` não foi criado.** Nesta etapa o único artefato de infraestrutura é o `docker-compose.yml` de desenvolvimento, que fica na raiz para que `docker compose up -d` funcione sem argumentos. A pasta `infra/` será criada junto com o primeiro artefato de deploy (Dockerfile da API, IaC).
- **Módulos nascem com a funcionalidade.** Nada de pastas com código vazio; cada módulo foi criado na etapa que o implementou.
- **Domínio em etapas.** Primeiro contas (`users`, `auth`, ver [auth.md](auth.md)), depois o núcleo social (`posts`, `comments`, `reactions`, `follows`, ver [content.md](content.md)). Por fim feed, busca, notificações, mídia e moderação (ver [discovery.md](discovery.md), [media.md](media.md) e [moderation.md](moderation.md)).
