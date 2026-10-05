# Módulo `auth`

> Ainda não implementado. Este arquivo define a fronteira do módulo para orientar a implementação.

Responsável por cadastro de credenciais, login, emissão e renovação de sessões/tokens, recuperação de senha e verificação de e-mail. Não guarda dados de perfil (isso é `users`). Os guards de autenticação ficarão em `common/` apenas quando forem usados por vários módulos.

**Depende de:** `users`, Redis (sessões, rate limiting de login).
