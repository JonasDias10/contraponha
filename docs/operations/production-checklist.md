# Checklist de produção

O que precisa estar configurado antes de abrir o Contraponha ao público. O pipeline de deploy, as imagens Docker e os backups ficam fora deste repositório por enquanto; este guia cobre o que o código espera do ambiente.

## API (`.env` da raiz)

- [ ] `NODE_ENV=production`, `TRUST_PROXY` conforme o balanceador, `SWAGGER_ENABLED=false` (ou atrás de autenticação).
- [ ] `DATABASE_URL` e `REDIS_URL` apontando para serviços gerenciados, com TLS. Rode `pnpm db:migrate` a cada deploy, antes de subir a nova versão.
- [ ] `WEB_APP_URL` com o endereço público do web (vai nos links dos e-mails) e `CORS_ORIGINS` com web e hub.
- [ ] SMTP de produção (`SMTP_*`, `EMAIL_FROM`) com SPF, DKIM e DMARC configurados no domínio do remetente.
- [ ] `TWO_FACTOR_ENCRYPTION_KEY`: 32 bytes em base64 (`openssl rand -base64 32`). A API não sobe em produção sem ela. Guarde num cofre de segredos: perder a chave invalida a verificação em duas etapas de todo mundo.
- [ ] `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile). Sem ela, o cadastro não pede verificação humana.
- [ ] `WRITE_LIMIT_MULTIPLIER` em `1` (o padrão). Só aumente para eventos com muito tráfego legítimo.
- [ ] `SENTRY_DSN`, `SENTRY_ENVIRONMENT` e `SENTRY_TRACES_SAMPLE_RATE`.
- [ ] Push: `PUSH_ENABLED=true` e `EXPO_ACCESS_TOKEN` (veja [push.md](../architecture/push.md)).
- [ ] `BACKGROUND_JOBS_ENABLED=true` em uma instância só (exclusões de conta, exportações de dados e limpeza).

## Mídia

- [ ] Bucket S3 (`STORAGE_*`) na região mais próxima do público (de preferência no Brasil, por LGPD).
- [ ] A política do bucket libera `GetObject` público apenas em `posts/*` e `avatars/*`. A API reaplica essa política ao iniciar; confira se a credencial tem permissão para isso ou aplique a mesma política manualmente. `exports/*` nunca é público.
- [ ] CDN na frente do bucket e `MEDIA_PUBLIC_BASE_URL` apontando para ela (veja [media.md](../architecture/media.md)).

## Web (`apps/web/.env`)

- [ ] `API_URL` (rede interna) e `SITE_URL` (endereço público, usado nas URLs absolutas do Open Graph).
- [ ] `NEXT_PUBLIC_HUB_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_ENVIRONMENT`.
- [ ] `LEGAL_DPO_EMAIL`, `LEGAL_CONTACT_EMAIL` e `LEGAL_TRANSPARENCY_EMAIL`. Sem eles, as páginas de privacidade, termos e transparência mostram "e-mail não configurado". Revise também o texto jurídico em `apps/web/content/legal/` com quem responde legalmente pelo serviço.
- [ ] `APPLE_TEAM_ID` e `ANDROID_SHA256_CERT_FINGERPRINTS` para os links do site abrirem no app (universal links e app links).
- [ ] No build: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` para enviar os source maps.

## Hub (`apps/hub/.env`)

- [ ] `API_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_ENVIRONMENT`.
- [ ] Acesso restrito por rede ou por um proxy com autenticação, além do login com verificação em duas etapas.

## Mobile (EAS)

- [ ] `eas init` e as credenciais de APNs e FCM no EAS para o push.
- [ ] `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` (https, o mesmo domínio do web: ativa os universal links), `EXPO_PUBLIC_HUB_URL`, `EXPO_PUBLIC_SENTRY_DSN` e `EXPO_PUBLIC_TURNSTILE_ENABLED=true` quando o Turnstile estiver ativo.
- [ ] Source maps do Sentry no build do EAS (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`).
- [ ] As impressões digitais do certificado de assinatura Android (`eas credentials`) copiadas para `ANDROID_SHA256_CERT_FINGERPRINTS` no web.

## Primeiro admin

1. Crie a conta pelo cadastro normal e confirme o e-mail.
2. `pnpm users:set-role --handle <handle> --role admin` com o `DATABASE_URL` de produção.
3. Entre no Contraponha com essa conta e ative a verificação em duas etapas em Configurações > Conta. O hub recusa moderadores e admins sem ela.
4. Guarde os códigos de recuperação fora do celular.

## Antes de anunciar

- [ ] `pnpm test:e2e` e `pnpm test:browser` passando contra a versão que vai ao ar.
- [ ] Readiness (`/api/v1/health/ready`) monitorado, com alerta.
- [ ] Backups do PostgreSQL com restauração testada.
- [ ] Um teste manual com leitor de tela (VoiceOver e TalkBack) nos fluxos de cadastro, leitura e publicação.
