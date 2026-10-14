# Autenticação e contas

Este documento descreve como funcionam cadastro, login, sessões, verificação de e-mail e redefinição de senha, e por que cada decisão foi tomada.

## Visão geral

| Tema            | Decisão                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| Credencial      | E-mail e senha. Login social (Google/Apple) virá depois, sem mudar sessões. |
| Sessão          | Token opaco aleatório, guardado como hash no PostgreSQL, com cache no Redis |
| Transporte      | `Authorization: Bearer <token>` em todas as rotas protegidas                |
| Hash de senha   | argon2id (19 MiB, 2 iterações, paralelismo 1, recomendação OWASP)           |
| E-mail          | SMTP via `EmailSender`; Mailpit em desenvolvimento                          |
| Proteção padrão | Toda rota exige sessão, exceto as marcadas com `@Public()`                  |

## Por que sessões opacas e não JWT

- **Revogação imediata.** Logout, "sair de todos os dispositivos", troca e redefinição de senha encerram sessões na hora. Com JWT, um token roubado continua válido até expirar.
- **LGPD.** Encerrar o acesso de uma conta (bloqueio, exclusão, pedido do titular) é uma escrita no banco, sem esperar expiração.
- **Simplicidade.** Não há chaves de assinatura para rotacionar nem par access/refresh para coordenar entre web e mobile.

O custo é uma consulta por requisição autenticada, absorvido pelo cache no Redis.

## Modelo de dados

| Tabela                 | Dono    | Conteúdo                                                                              |
| ---------------------- | ------- | ------------------------------------------------------------------------------------- |
| `users`                | `users` | Conta e perfil: e-mail, handle, nome de exibição, bio, idioma                         |
| `password_credentials` | `auth`  | Hash argon2id da senha (1:1 com `users`)                                              |
| `sessions`             | `auth`  | Hash do token, user agent, criação, último uso, expiração, revogação                  |
| `verification_tokens`  | `auth`  | Hash do token, finalidade (`email_verification`/`password_reset`), expiração, consumo |

- A senha fica fora de `users`. Identidades externas (OAuth) entrarão como outra tabela do `auth` (`external_identities`) e uma conta poderá ter só uma delas, as duas ou várias.
- E-mail e handle são normalizados para minúsculas antes de gravar, e o banco tem `CHECK` que garante isso. A unicidade, portanto, não diferencia maiúsculas.
- IDs são UUID v7 gerados pelo PostgreSQL 18 (`uuidv7()`): ordenáveis por tempo e bons para índices.
- Todas as tabelas do `auth` usam `ON DELETE CASCADE` para `users`. Excluir uma conta apaga credenciais, sessões e tokens.
- **Minimização de dados:** sessões guardam o user agent (para a tela de "dispositivos conectados") mas **não** guardam IP.

## Sessões

1. Login ou cadastro gera 32 bytes aleatórios (`base64url`, 43 caracteres). O cliente recebe o token **uma única vez**.
2. O banco guarda apenas o SHA-256 do token. Um vazamento do banco não permite usar sessões.
3. A cada requisição, o `SessionAuthGuard` lê o header `Authorization`, calcula o hash e procura a sessão:
   - primeiro no Redis (`session:<hash>`, TTL de até 15 min);
   - se não houver, no PostgreSQL (sessão não revogada e não expirada), e o resultado vai para o cache.
4. Ao revogar uma sessão, a linha recebe `revoked_at` **e** a chave do Redis é apagada. O efeito é imediato.
5. `last_used_at` é atualizado no máximo a cada 5 minutos por sessão, fora do caminho crítico da requisição.
6. Expiração absoluta configurável (`SESSION_TTL_DAYS`, padrão 30 dias).

### Por que a API não usa cookies

A API aceita somente Bearer. Isso elimina CSRF na API (navegadores não enviam o header sozinhos) e funciona igual para web e mobile.

- **Mobile** guarda o token em armazenamento seguro do sistema (Keychain/Keystore, via `expo-secure-store`) e o envia com `getSessionToken` do `@contraponha/api-client`.
- **Web** usa o servidor do Next.js como intermediário: o login acontece numa Server Action, o token vai para um cookie `httpOnly`, `Secure`, `SameSite=Lax` **no domínio do web**, e os server components o repassam como Bearer para a API. O JavaScript do navegador nunca vê o token. As Server Actions do Next já verificam a origem das requisições.

## Rotas

Todas sob `/api/v1`. Documentação completa em `/api/docs`.

| Método e rota                           | Sessão | Limite estrito | Resposta                       |
| --------------------------------------- | ------ | -------------- | ------------------------------ |
| `POST /auth/register`                   | não    | sim            | 201 `{ user, session }`        |
| `POST /auth/login`                      | não    | sim            | 200 `{ user, session }`        |
| `POST /auth/logout`                     | sim    | não            | 204                            |
| `PUT /auth/password`                    | sim    | sim            | 204, encerra as outras sessões |
| `GET /auth/sessions`                    | sim    | não            | 200 `{ sessions }`             |
| `DELETE /auth/sessions`                 | sim    | não            | 204, encerra as outras sessões |
| `DELETE /auth/sessions/:sessionId`      | sim    | não            | 204                            |
| `POST /auth/email-verification`         | sim    | sim            | 202, reenvia o link            |
| `POST /auth/email-verification/confirm` | não    | não            | 204                            |
| `POST /auth/password-reset`             | não    | sim            | 202 sempre                     |
| `POST /auth/password-reset/confirm`     | não    | sim            | 204, encerra todas as sessões  |
| `GET /users/me`                         | sim    | não            | 200 perfil privado             |
| `PATCH /users/me`                       | sim    | não            | 200 perfil privado             |
| `GET /users/:handle`                    | não    | não            | 200 perfil público             |

## Verificação de e-mail e redefinição de senha

- Os tokens seguem o mesmo padrão das sessões: aleatórios, guardados como hash, enviados uma única vez por e-mail.
- **Uso único e atômico:** o consumo é um único `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`. Duas requisições simultâneas com o mesmo token não passam as duas.
- Pedir um novo link invalida os anteriores da mesma finalidade.
- Validade: 24 horas para verificação de e-mail, 30 minutos para redefinição de senha.
- Redefinir a senha encerra **todas** as sessões e marca o e-mail como verificado (quem recebeu o link prova que controla a caixa).
- Os links apontam para o web (`WEB_APP_URL` + `/verify-email?token=` ou `/reset-password?token=`). As páginas que recebem esses links serão criadas no web junto com as telas de conta.
- E-mails saem no idioma salvo na conta, com versão texto e HTML (conteúdo do usuário é escapado).
- O envio não bloqueia a resposta: falhas de SMTP são registradas em log sem derrubar a requisição. Quando houver fila (Redis/BullMQ), o envio passa para um job com retentativas.

## Proteções contra abuso e enumeração

- **Rate limit estrito** (`AUTH_RATE_LIMIT_*`, padrão 10 requisições a cada 15 minutos por IP e rota) em cadastro, login, troca e redefinição de senha e reenvio de verificação, além do limite global.
- **Login sem enumeração:** e-mail inexistente e senha errada respondem igual (`INVALID_CREDENTIALS`, mesmo texto). Quando a conta não existe, a API ainda executa uma verificação argon2 contra um hash descartável, para que o tempo de resposta também não revele nada.
- **Redefinição sem enumeração:** `POST /auth/password-reset` responde 202 para qualquer e-mail.
- **Cadastro revela conflito** (`EMAIL_ALREADY_IN_USE`, `HANDLE_UNAVAILABLE`). É uma troca consciente: esconder isso pioraria muito a experiência e o handle precisa ser público de qualquer forma. O rate limit reduz a utilidade dessa informação para varredura.
- **Handles reservados** (`admin`, `api`, `me`, `settings`, `support`...) não podem ser usados.
- **Nada sensível em logs:** senha, tokens, header `Authorization` e query strings não são registrados (veja [backend.md](backend.md#logs)).

## Senhas

- Mínimo de 10 e máximo de 128 caracteres, sem regras de composição (seguindo NIST SP 800-63B: comprimento importa mais que símbolos obrigatórios).
- No login, a API aceita qualquer senha não vazia até 128 caracteres; a regra de tamanho mínimo só vale para senhas novas.
- Próximos passos possíveis: checar senhas vazadas (Have I Been Pwned, modelo k-anonymity) e 2FA (TOTP).

## Anti-spam

- **Cadastro com Turnstile.** Com `TURNSTILE_SECRET_KEY` na API, `POST /auth/register` exige `humanCheckToken`, conferido no Cloudflare antes de criar a conta (`HUMAN_CHECK_FAILED`). Se o Cloudflare não responde, o cadastro é recusado (falha fechada). O web mostra o widget com `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; o mobile abre a página `/human-check` do web numa WebView quando `EXPO_PUBLIC_TURNSTILE_ENABLED=true`. Sem chave, a checagem fica desligada (desenvolvimento e testes).
- **E-mail confirmado para publicar.** Postar, comentar, reagir, republicar e seguir passam pelo `WriteGuard`, que responde `EMAIL_NOT_VERIFIED` (403) a contas sem e-mail confirmado.
- **Limites por conta.** O mesmo guard conta, no Redis, as ações de cada conta por hora e responde `RATE_LIMIT_EXCEEDED` (429, com `Retry-After`) acima do limite. Contas com menos de 24 h têm limites mais baixos, porque ondas de spam usam contas recém-criadas. Os valores ficam em `modules/users/domain/write-limits.ts` e podem ser multiplicados por `WRITE_LIMIT_MULTIPLIER`.

## Verificação em duas etapas (TOTP)

| Rota                                   | O que faz                                                        |
| -------------------------------------- | ---------------------------------------------------------------- |
| `GET /auth/two-factor`                 | Se está ativa e quantos códigos de recuperação restam            |
| `POST /auth/two-factor/setup`          | Novo segredo e URL `otpauth://`; nada muda até confirmar         |
| `POST /auth/two-factor/enable`         | Confirma um código e devolve 10 códigos de recuperação (uma vez) |
| `POST /auth/two-factor/disable`        | Desativa com um código do app ou de recuperação                  |
| `POST /auth/two-factor/recovery-codes` | Gera novos códigos; os antigos deixam de valer                   |
| `POST /auth/login/two-factor`          | Segunda etapa do login                                           |

- **Login em duas etapas.** Com 2FA ativa, `POST /auth/login` devolve `{ challengeToken, expiresAt }` em vez de sessão. O desafio fica no Redis por 5 minutos, só com o hash do token, e aceita 5 tentativas.
- **Segredo cifrado.** O segredo TOTP fica em `two_factor_secrets` cifrado com AES-256-GCM (`TWO_FACTOR_ENCRYPTION_KEY`, obrigatória em produção). `last_used_step` impede reusar o mesmo código. Códigos de recuperação ficam só como SHA-256 e valem uma vez.
- **Equipe.** Moderadores e admins precisam de 2FA ativa: o `RoleGuard` responde `TWO_FACTOR_REQUIRED` (403) nas rotas de moderação e administração, e o hub manda para uma página explicando como ativar. `users.two_factor_enabled_at` espelha o estado para essas checagens não precisarem de join.
- Web, hub e mobile têm a segunda etapa do login; web e mobile têm a configuração (QR code no web, link `otpauth://` direto no celular).

## Códigos de erro

| Código                    | HTTP | Quando                                                         |
| ------------------------- | ---- | -------------------------------------------------------------- |
| `UNAUTHORIZED`            | 401  | Sem sessão, token inválido, expirado ou revogado               |
| `INVALID_CREDENTIALS`     | 401  | E-mail ou senha incorretos; senha atual incorreta              |
| `INVALID_TOKEN`           | 400  | Link de verificação ou redefinição inválido, usado ou expirado |
| `EMAIL_ALREADY_IN_USE`    | 409  | Cadastro com e-mail existente                                  |
| `HANDLE_UNAVAILABLE`      | 409  | Handle já usado ou reservado                                   |
| `HUMAN_CHECK_FAILED`      | 400  | Cadastro sem verificação do Turnstile válida                   |
| `EMAIL_NOT_VERIFIED`      | 403  | Publicar sem e-mail confirmado                                 |
| `TWO_FACTOR_REQUIRED`     | 403  | Rota de moderação ou administração sem 2FA ativa               |
| `INVALID_TWO_FACTOR_CODE` | 401  | Código do app ou de recuperação inválido ou já usado           |

## O que ainda não existe

- Login social (Google, Apple).
- Checagem de senhas vazadas e passkeys.
