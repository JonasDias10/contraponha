# Feed, busca e notificações

Este documento cobre como as pessoas encontram conteúdo (`feed`, `search`) e como ficam sabendo do que aconteceu com o delas (`notifications`).

## Exceção de leitura entre módulos

A regra geral é que um módulo não lê as tabelas de outro. `feed` e `search` são a exceção documentada: são **modelos de leitura**. Seus repositórios fazem `JOIN` em `posts`, `follows` e `users` para montar listas numa única consulta, mas **nunca escrevem** nessas tabelas. A montagem das views (autor, mídia) continua com `PostsService.buildViews`, que busca autores e mídias em lote.

Sem essa exceção, cada página do feed custaria uma chamada por módulo e por item. Se um dia o feed for extraído, o modelo de leitura vira uma tabela materializada própria, alimentada por eventos, e o contrato HTTP não muda.

## Feed

| Rota                  | Auth | Ordem                                |
| --------------------- | ---- | ------------------------------------ |
| `GET /feed/following` | sim  | Cronológica, mais recentes primeiro  |
| `GET /feed/discover`  | não  | Pipeline de qualidade com decaimento |

### Seguindo

Posts ativos de quem a pessoa segue **e os dela própria**, em ordem cronológica. A consulta usa uma subconsulta em `follows` e o índice parcial `posts_active_created_at_idx`; a paginação é por cursor (`createdAt`, `id`), estável mesmo com posts novos chegando.

### Descobrir

Posts ativos dos últimos `FEED_FEATURED_WINDOW_DAYS` (7) dias, montados por um pipeline em etapas (`modules/feed/domain/discover-pipeline.ts`):

1. **Fontes de candidatos.** `listFollowedTopicCandidates` (posts nos tópicos que a pessoa segue, com o tópico que explica a escolha) e `listQualityCandidates` (os melhores posts de qualquer tópico). Cada fonte traz até `DISCOVER_CANDIDATES_PER_SOURCE` posts, o bastante para preencher todas as páginas até o limite de deslocamento. Anônimos só usam a segunda.
2. **Merge.** Posts repetidos ficam com a cópia da primeira fonte, a que tem o motivo da recomendação.
3. **Filtros.** Saem os posts da própria pessoa, os posts que ela denunciou e os de autores que ela denunciou (qualquer status de denúncia: se a moderação descartou, a pessoa ainda não quer ver). As denúncias são buscadas só para os candidatos da página.
4. **Score.** Pontuação de qualidade com decaimento, multiplicada por `FOLLOWED_TOPIC_BOOST` quando o post está num tópico seguido:

   ```text
   qualidade = (1 + 3·bom_argumento + 3·mudou_minha_visão + 2·esclarecedor + 1·comentários) / (idade_em_horas + 2) ^ 1,5
   ```

5. **Diversidade de autor.** Cada post a mais do mesmo autor pesa `(1 - 0,1) · 0,5 ^ n + 0,1`, onde `n` é quantos posts dele já estão acima. Um autor prolífico não ocupa a página inteira, mas nunca some.
6. **Página.** Fatia do ranking pelo offset do cursor; só os posts da página são carregados e viram views.

- **Só sinais de qualidade.** Não há reação de concordância e popularidade (seguidores, visualizações) não entra: um post bem argumentado com o qual a maioria discorda pode, e deve, aparecer.
- **Decaimento no estilo Hacker News.** A gravidade 1,5 faz posts antigos cederem lugar aos novos; o `+2` evita que um post recém-criado domine por divisão por quase zero.
- **Etapas independentes.** Um modelo de ranking aprendido trocaria só `scoreCandidates`; uma fonte nova (por exemplo, pessoas parecidas) é mais uma consulta no merge.
- Pesos e constantes ficam em `modules/feed/domain/featured-ranking.ts`.

Como o score muda com o tempo, cursor por chave não funciona. A paginação é por deslocamento (cursor opaco com offset), limitada a `FEATURED_MAX_OFFSET` (500 posts). Cada página recalcula o ranking sobre os candidatos (algumas centenas de linhas leves: id, autor e score); quando o volume justificar, as fontes passam a ler de uma tabela de scores pré-calculada por um job.

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

Tipos: `post_commented`, `comment_replied`, `post_reacted`, `comment_reacted`, `user_followed`. Os textos ficam no namespace `notifications` do `@ponto/i18n`, com a variável `{actor}`.

Regras:

- A notificação é gravada **na mesma transação** da ação que a gerou. Se o comentário falha, a notificação não existe.
- Ninguém é notificado das próprias ações.
- Só há notificação quando a ação realmente aconteceu: repetir uma reação ou seguir de novo (operações idempotentes) não gera outra.
- Notificação de outra pessoa responde 404, nunca 403, para não revelar que o id existe.

Entrega em tempo real (WebSocket, push) fica para depois; os clientes consultam `unread-count`.
