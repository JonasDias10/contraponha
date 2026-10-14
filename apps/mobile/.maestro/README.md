# Fluxos do Maestro

Testes de ponta a ponta do app mobile com o [Maestro](https://maestro.dev). Cada fluxo cria uma conta nova pela API (com o e-mail confirmado pelo Mailpit e o onboarding concluído), entra pelo app e percorre um caminho principal.

| Fluxo               | O que cobre                               |
| ------------------- | ----------------------------------------- |
| `publish-post.yaml` | Entrar, escrever e publicar um post       |
| `save-post.yaml`    | Publicar e salvar um post para ler depois |

## Rodar

Precisa de `docker compose up -d`, da API rodando (`pnpm dev:api`) e do Metro (`pnpm dev:mobile`).

Com um build de desenvolvimento instalado no simulador ou emulador:

```bash
maestro test apps/mobile/.maestro \
  -e APP_ID=app.contraponha.mobile \
  -e API_URL=http://localhost:3000 \
  -e MAILPIT_URL=http://localhost:8025
```

Sem build próprio, os fluxos rodam dentro do Expo Go, que abre o projeto a partir do Metro:

```bash
maestro test apps/mobile/.maestro \
  -e APP_ID=host.exp.Exponent \
  -e EXPO_GO=true \
  -e EXPO_URL=exp://127.0.0.1:8081 \
  -e API_URL=http://localhost:3000 \
  -e MAILPIT_URL=http://localhost:8025
```

No emulador Android, troque `localhost` por `10.0.2.2` em `API_URL` e `MAILPIT_URL`.

## Escrevendo fluxos

- A tela de login segue o idioma do aparelho, então é acionada por `testID` (`welcome-sign-in`, `login-email`, `login-password`, `login-submit`). Depois de entrar, o app segue o idioma da conta (pt-BR), e os fluxos usam os textos em português.
- Prefira textos e rótulos de acessibilidade aos `testID`: o que o Maestro encontra pelo rótulo, o leitor de tela também encontra.
- Os fluxos ainda não rodam no CI; isso depende de um build de desenvolvimento (EAS) e de um runner com simulador.
