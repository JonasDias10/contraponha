# Moderação

O módulo `moderation` cuida de denúncias, remoção de conteúdo por moderadores, papéis e trilha de auditoria.

## Papéis

| Papel       | Pode                                                            |
| ----------- | --------------------------------------------------------------- |
| `member`    | Usar a plataforma e denunciar                                   |
| `moderator` | Tudo de `member`, listar e resolver denúncias, remover conteúdo |
| `admin`     | Tudo de `moderator`, alterar papéis                             |

Os papéis são cumulativos (`hasRole` em `modules/users/domain/roles.ts`). As rotas privilegiadas usam `@UseGuards(RoleGuard)` com `@RequireRole(...)`. O guard roda depois do guard global de sessão e consulta o papel no banco a cada requisição, então uma mudança de papel vale na hora, sem esperar a sessão expirar. O custo dessa consulta existe só nas rotas de moderação.

O primeiro admin é criado fora da API:

```bash
pnpm users:set-role --handle maria --role admin
```

O comando também é registrado na trilha de auditoria, com moderador nulo.

## Denúncias

`POST /reports` (autenticado, com rate limit estrito) aceita `targetType` (`post`, `comment`, `user`), `targetId`, `reason` (`spam`, `harassment`, `hate`, `misinformation`, `violence`, `sexual_content`, `other`) e `details` opcional.

- O alvo precisa existir e estar ativo (404 caso contrário).
- Cada pessoa tem no máximo **uma denúncia aberta por alvo**, garantido por índices únicos parciais. Repetir responde `DUPLICATE_REPORT` (409).

## Rotas de moderação

Todas exigem `moderator`, salvo indicação:

| Rota                                          | Descrição                                                         |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `GET /moderation/reports?status=`             | Denúncias por status (`open` por padrão), mais recentes primeiro  |
| `POST /moderation/reports/:reportId/resolve`  | `{ resolution: "remove_content" \| "dismiss", note? }`            |
| `POST /moderation/posts/:postId/remove`       | Remove um post diretamente (`{ note? }`)                          |
| `POST /moderation/comments/:commentId/remove` | Remove um comentário diretamente                                  |
| `GET /moderation/actions`                     | Trilha de auditoria, mais recentes primeiro                       |
| `PUT /moderation/users/:handle/role`          | Altera o papel (**admin**); um admin não pode rebaixar a si mesmo |

Regras da resolução:

- Fechar a denúncia, remover o conteúdo e registrar a ação acontecem **numa única transação**.
- Uma denúncia já fechada responde 409.
- Denúncias de conta não removem nada (`remove_content` em alvo `user` responde 400). Suspensão de contas fica para uma etapa futura.
- Se o conteúdo já tinha sido removido, a denúncia é resolvida sem erro.

## Conteúdo removido

Posts e comentários têm `removed_by` (`author` ou `moderation`), preenchido junto com `deleted_at`. Uma constraint garante que os dois andam juntos. Os clientes mostram "removido pela moderação" ou "removido pelo autor" a partir de `removedBy`; o corpo nunca é devolvido. As imagens de um post removido são apagadas do storage (ver [media.md](media.md)).

## Auditoria

`moderation_actions` é **append-only**: o repositório só insere e lista. Tipos: `content_removed`, `report_resolved`, `report_dismissed`, `role_changed`. Cada linha guarda moderador, denúncia, alvo e nota. As chaves estrangeiras usam `ON DELETE SET NULL`, para que a trilha sobreviva à exclusão de contas e conteúdos (requisito de LGPD: o registro da ação permanece, os dados pessoais saem).
