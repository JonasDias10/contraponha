# Feed, busca e notificações

Este documento cobre como as pessoas encontram conteúdo (`feed`, `search`) e como ficam sabendo do que aconteceu com o delas (`notifications`).

## Exceção de leitura entre módulos

A regra geral é que um módulo não lê as tabelas de outro. `feed` e `search` são a exceção documentada: são **modelos de leitura**. Seus repositórios fazem `JOIN` em `posts`, `follows` e `users` para montar listas numa única consulta, mas **nunca escrevem** nessas tabelas. A montagem das views (autor, mídia) continua com `PostsService.buildViews`, que busca autores e mídias em lote.

Sem essa exceção, cada página do feed custaria uma chamada por módulo e por item. Se um dia o feed for extraído, o modelo de leitura vira uma tabela materializada própria, alimentada por eventos, e o contrato HTTP não muda.

## Feed

| Rota                  | Auth | Ordem                                 |
| --------------------- | ---- | ------------------------------------- |
| `GET /feed/following` | sim  | Cronológica, mais recentes primeiro   |
| `GET /feed/featured`  | não  | Pontuação de qualidade com decaimento |

### Seguindo

Posts ativos de quem a pessoa segue **e os dela própria**, em ordem cronológica. A consulta usa uma subconsulta em `follows` e o índice parcial `posts_active_created_at_idx`; a paginação é por cursor (`createdAt`, `id`), estável mesmo com posts novos chegando.

### Em destaque

Posts ativos dos últimos `FEED_FEATURED_WINDOW_DAYS` (7) dias, ordenados por:

```text
score = (1 + 3·bom_argumento + 2·perspicaz + 1·comentários) / (idade_em_horas + 2) ^ 1,5
```

- **Só sinais de qualidade.** "Concordo" e "discordo" não entram: um post bem argumentado com o qual a maioria discorda pode, e deve, aparecer em destaque.
- **Decaimento no estilo Hacker News.** A gravidade 1,5 faz posts antigos cederem lugar aos novos; o `+2` evita que um post recém-criado domine por divisão por quase zero.
- Pesos e constantes ficam em `modules/feed/domain/featured-ranking.ts`.

Como o score muda com o tempo, cursor por chave não funciona. A paginação é por deslocamento (cursor opaco com offset), limitada a `FEATURED_MAX_OFFSET` (500 posts). É o suficiente para um feed de destaques e mantém a consulta barata. Quando o volume justificar, o score passa a ser pré-calculado por um job e guardado numa tabela ordenável.

## Busca

| Rota                   | Auth | Como funciona                                   |
| ---------------------- | ---- | ----------------------------------------------- |
| `GET /search/users?q=` | não  | `pg_trgm` em `handle` e `display_name`          |
| `GET /search/posts?q=` | não  | Full-text search em português (`search_vector`) |

`q` tem de 2 a 100 caracteres. A paginação é por deslocamento, limitada a `SEARCH_MAX_OFFSET` (200 resultados).

- **Pessoas.** Combina `ILIKE` (prefixo e trecho, com `%` e `_` escapados) e similaridade por trigramas, o que tolera pequenos erros de digitação ("Dulcinea" encontra "Dulcineia"). Índices GIN `gin_trgm_ops` nas duas colunas. A extensão `pg_trgm` é habilitada por uma migration própria.
- **Posts.** A coluna gerada `search_vector = to_tsvector('portuguese', body)` tem índice GIN. A consulta usa `websearch_to_tsquery('portuguese', q)`, que entende a sintaxe que as pessoas já conhecem (`"frase exata"`, `-excluir`, `or`), e ordena por `ts_rank`. O stemming em português faz "argumento convincente" encontrar "argumentos foram convincentes". Posts removidos não aparecem.

Nenhum serviço de busca extra (Elasticsearch, Meilisearch) foi adicionado: o PostgreSQL atende bem até um volume considerável, e a troca fica isolada no `SearchRepository`.

## Notificações

| Rota                                       | Auth | Descrição                          |
| ------------------------------------------ | ---- | ---------------------------------- |
| `GET /notifications`                       | sim  | Mais recentes primeiro, com cursor |
| `GET /notifications/unread-count`          | sim  | `{ count }`                        |
| `POST /notifications/:notificationId/read` | sim  | Marca uma como lida (idempotente)  |
| `POST /notifications/read-all`             | sim  | Marca todas como lidas             |

Tipos: `post_commented`, `comment_replied`, `post_reacted`, `comment_reacted`, `user_followed`. Os textos ficam no namespace `notifications` do `@contraponha/i18n`, com a variável `{actor}`.

Regras:

- A notificação é gravada **na mesma transação** da ação que a gerou. Se o comentário falha, a notificação não existe.
- Ninguém é notificado das próprias ações.
- Só há notificação quando a ação realmente aconteceu: repetir uma reação ou seguir de novo (operações idempotentes) não gera outra.
- Notificação de outra pessoa responde 404, nunca 403, para não revelar que o id existe.

Entrega em tempo real (WebSocket, push) fica para depois; os clientes consultam `unread-count`.
