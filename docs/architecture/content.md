# Conteúdo e relações: posts, comentários, reações e follows

Este documento descreve o núcleo social do Ponto: como posts, comentários, reações e follows são modelados, quais regras valem e por quê.

## Decisões de produto

| Tema       | Decisão                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Post       | Texto de 1 a 5.000 caracteres (espaço para desenvolver um argumento)                                        |
| Comentário | Texto de 1 a 2.000 caracteres                                                                               |
| Respostas  | Um nível: comentário no post e respostas a ele. Responder a uma resposta anexa ao comentário raiz           |
| Edição     | Só nos primeiros **30 minutos** após publicar. Depois disso, só excluindo e publicando de novo              |
| Histórico  | Toda edição guarda a versão anterior, visível publicamente (transparência)                                  |
| Exclusão   | Soft delete: conteúdo e histórico são apagados, a linha fica como marcador `[removido]`                     |
| Reações    | `good_argument`, `insightful`, `agree`, `disagree`. Uma de cada por pessoa; `agree` e `disagree` se excluem |
| Follows    | Unilateral, sem aprovação                                                                                   |

Os limites de tamanho ficam em `@ponto/config` (`POST_BODY_MAX_LENGTH`, `COMMENT_BODY_MAX_LENGTH`) e são usados tanto pela validação (`@ponto/validation`) quanto pelos `CHECK` do banco. A janela de edição é `CONTENT_EDIT_WINDOW_MINUTES` em `apps/api/src/config/durations.ts`.

### Por que reações de qualidade separadas de concordância

O diferencial do Ponto é favorecer bons argumentos, não só popularidade. Separar "isto é um bom argumento" de "concordo" permite reconhecer um argumento sólido mesmo discordando dele, e dá ao futuro ranking um sinal de qualidade que não é só opinião.

### Por que a janela de edição

Edições tardias podem mudar o sentido de algo que já recebeu respostas e reações. Trinta minutos cobrem correções de digitação e de clareza; depois disso, quem quiser mudar o conteúdo publica de novo, e quem respondeu continua respondendo ao que foi dito.

## Módulos e dependências

```text
users  <──  posts  <──  comments
   ^          ^            ^
   │          └── reactions┘
   └── follows
```

- `posts` e `comments` dependem de `users` para mostrar o autor.
- `comments` depende de `posts` (o post precisa existir e estar ativo).
- `reactions` depende de `posts` e `comments` (valida o alvo e atualiza contadores).
- `follows` depende de `users`.
- Não há ciclos: `posts` não conhece `comments` nem `reactions`.

## Contadores denormalizados

Cada contagem mora na tabela do módulo dono:

| Contador                                                                   | Tabela              | Quem atualiza (via serviço do dono) |
| -------------------------------------------------------------------------- | ------------------- | ----------------------------------- |
| `comment_count`                                                            | `posts`             | `comments`                          |
| `good_argument_count`, `insightful_count`, `agree_count`, `disagree_count` | `posts`, `comments` | `reactions`                         |
| `reply_count`                                                              | `comments`          | `comments`                          |
| `follower_count`, `following_count`                                        | `users`             | `follows`                           |

Por quê:

- **Leitura O(1), sem N+1.** Listar 20 posts não dispara 20 contagens.
- **Sem dependência circular.** Para mostrar as reações de um post, `posts` não precisa consultar `reactions`.
- **Base para o ranking.** O futuro módulo `feed` lê sinais de engajamento direto das linhas.

Como a consistência é garantida:

- O evento e o ajuste do contador acontecem **na mesma transação** (por exemplo: inserir a reação e incrementar `good_argument_count`).
- O incremento é atômico no banco (`SET x = x + 1`), seguro com requisições simultâneas.
- O contador só muda quando a linha realmente foi inserida ou removida (`ON CONFLICT DO NOTHING ... RETURNING`). Repetir a mesma reação, inclusive em paralelo, não incrementa duas vezes; há um teste e2e com 10 requisições simultâneas.
- `CHECK` impede contadores negativos.

## Modelo de dados

| Tabela              | Dono        | Observações                                                                                                                                                   |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `posts`             | `posts`     | `body` nulo se e somente se `deleted_at` preenchido (`CHECK`)                                                                                                 |
| `post_revisions`    | `posts`     | Versões anteriores; apagadas junto com o conteúdo                                                                                                             |
| `comments`          | `comments`  | `parent_id` aponta sempre para um comentário raiz                                                                                                             |
| `comment_revisions` | `comments`  | Versões anteriores                                                                                                                                            |
| `reactions`         | `reactions` | Uma tabela para posts e comentários: `post_id` **ou** `comment_id` (`CHECK num_nonnulls = 1`), com chaves estrangeiras reais e unicidade por índices parciais |
| `follows`           | `follows`   | Chave primária `(follower_id, followee_id)`; `CHECK` impede seguir a si mesmo                                                                                 |

Todas as referências a `users` usam `ON DELETE CASCADE`, então excluir uma conta remove seu conteúdo, reações e follows.

## Exclusão (soft delete)

- O texto (`body`) vira `NULL` e todo o histórico de edições é apagado. A linha continua existindo para não quebrar respostas e contadores.
- A API devolve o item como marcador: `isDeleted: true`, `body: null`, `author: null`. Os apps exibem `content.removed` (`[removido]` em pt-BR).
- Posts removidos não aparecem na listagem do perfil.
- Comentários removidos só aparecem na listagem enquanto tiverem respostas; respostas removidas não aparecem.
- Não é possível editar, reagir ou comentar em conteúdo removido (`RESOURCE_NOT_FOUND`).

## Paginação

Todas as listas usam cursor opaco:

```json
{ "items": [...], "nextCursor": "eyJpZCI6..." }
```

- O cliente repassa `nextCursor` em `?cursor=` e define `?limit=` (1 a 50, padrão 20). `nextCursor: null` indica a última página.
- O cursor é JSON em base64url, validado no servidor; um cursor adulterado responde `VALIDATION_FAILED`.
- Posts e comentários paginam pelo `id` (UUID v7 já é ordenado por tempo). Follows paginam por `(created_at, user_id)`, com comparação de tupla no PostgreSQL, que mantém a ordem estável mesmo com datas iguais.
- O repositório busca `limit + 1` linhas; a linha extra só indica que há próxima página (`buildPage` em `common/pagination`).

## Rotas

Todas sob `/api/v1`.

| Método e rota                                 | Sessão | Descrição                                     |
| --------------------------------------------- | ------ | --------------------------------------------- |
| `POST /posts`                                 | sim    | Publica um post                               |
| `GET /posts/:postId`                          | não    | Lê um post (ou o marcador de removido)        |
| `PATCH /posts/:postId`                        | autor  | Edita dentro da janela                        |
| `DELETE /posts/:postId`                       | autor  | Remove                                        |
| `GET /posts/:postId/revisions`                | não    | Versões anteriores                            |
| `GET /users/:handle/posts`                    | não    | Posts do usuário, mais recentes primeiro      |
| `POST /posts/:postId/comments`                | sim    | Comenta ou responde (`parentId`)              |
| `GET /posts/:postId/comments`                 | não    | Comentários raiz, mais antigos primeiro       |
| `GET /comments/:commentId/replies`            | não    | Respostas da thread                           |
| `PATCH /comments/:commentId`                  | autor  | Edita dentro da janela                        |
| `DELETE /comments/:commentId`                 | autor  | Remove                                        |
| `GET /comments/:commentId/revisions`          | não    | Versões anteriores                            |
| `PUT /posts/:postId/reactions/:kind`          | sim    | Reage (idempotente)                           |
| `DELETE /posts/:postId/reactions/:kind`       | sim    | Remove a reação (idempotente)                 |
| `PUT /comments/:commentId/reactions/:kind`    | sim    | Reage a um comentário                         |
| `DELETE /comments/:commentId/reactions/:kind` | sim    | Remove a reação                               |
| `GET /reactions/mine?targetType=&targetIds=`  | sim    | Reações da pessoa em até 100 alvos de uma vez |
| `PUT /users/:handle/follow`                   | sim    | Segue (idempotente)                           |
| `DELETE /users/:handle/follow`                | sim    | Deixa de seguir (idempotente)                 |
| `GET /users/:handle/follow`                   | sim    | `{ isFollowing }`                             |
| `GET /users/:handle/followers`                | não    | Seguidores, mais recentes primeiro            |
| `GET /users/:handle/following`                | não    | Quem o usuário segue                          |

`GET /reactions/mine` existe para que listas (e o futuro feed) busquem as reações da pessoa em lote, em vez de uma requisição por item.

## Códigos de erro novos

| Código                    | HTTP | Quando                               |
| ------------------------- | ---- | ------------------------------------ |
| `EDIT_WINDOW_EXPIRED`     | 409  | Edição após 30 minutos da publicação |
| `SELF_FOLLOW_NOT_ALLOWED` | 400  | Tentativa de seguir a si mesmo       |

Edição ou exclusão por quem não é o autor responde `FORBIDDEN` (403).

## O que fica para depois

- Feed e ranking (`feed`), que vão consumir os contadores e o grafo de follows.
- Moderação: denúncias, remoção por moderadores, auditoria.
- Busca.
- Notificações de comentários, respostas, reações e novos seguidores.
- Mídia em posts.
- Bloqueio e silenciamento de usuários.
