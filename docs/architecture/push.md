# Push notifications

O app mobile recebe push pelas mesmas notificações que aparecem na tela de notificações, com as mesmas preferências e horários de resumo. O web não recebe push.

## Fluxo

```text
ação (comentário, menção...)        API                                Expo push → APNs/FCM
   │ notify() na transação ───▶ notifications (visible_at, pushed_at = null)
   │                            PushDispatchService a cada 5 s:
   │                              reserva as visíveis, não lidas e sem push (SKIP LOCKED)
   │                              monta o texto no idioma de quem recebe
   │                              envia para cada dispositivo ──────────────────▶│
   │                              apaga tokens "DeviceNotRegistered" ◀──────────│
```

- **Quando sai o push.** Uma notificação sai quando fica visível: na hora, ou no próximo horário de resumo que a pessoa escolheu. Decisões de moderação nunca esperam. Notificações já lidas antes disso não geram push.
- **Uma vez só.** A notificação é marcada (`pushed_at`) antes do envio. Se o serviço de push falhar, o erro é registrado e não há nova tentativa, para nunca mandar o mesmo aviso duas vezes. Várias instâncias da API podem rodar o despachante ao mesmo tempo, porque a reserva usa `FOR UPDATE SKIP LOCKED`.
- **Agrupamento.** Quando alguém entra num grupo que já recebeu push ("Ana e mais 2 comentaram"), não sai outro push; a tela de notificações mostra o grupo atualizado.
- **Texto.** É a mesma frase da tela de notificações (`notificationText` do `@contraponha/client-core`), no idioma da conta. O título é o título do post, quando há, ou "Contraponha". O badge é o total de não lidas.
- **Ao tocar.** O app abre o post (ou o comentário), o perfil de quem seguiu ou, em decisões de moderação, a tela de notificações. O payload (`PushNotificationData`) leva só ids e o tipo.

## Dispositivos

- `PUT /me/push-tokens { token, platform }` registra o token Expo do aparelho. O token é único: se outra conta entrar no mesmo aparelho, ele passa para ela.
- `DELETE /me/push-tokens/:token` é chamado ao sair da conta, antes do logout.
- Exclusão de conta apaga os tokens (cascade).
- O app pede permissão depois do onboarding. Sem permissão, em simulador ou sem projeto EAS, nada é registrado e o app funciona igual.

## Configuração

| Variável            | Uso                                                                       |
| ------------------- | ------------------------------------------------------------------------- |
| `PUSH_ENABLED`      | Liga o despachante (também depende de `BACKGROUND_JOBS_ENABLED`)          |
| `EXPO_ACCESS_TOKEN` | Opcional; necessário quando o projeto Expo exige "enhanced push security" |

No mobile, o token Expo depende do `projectId` do EAS em `app.json` (`extra.eas.projectId`), criado com `eas init`. As credenciais de APNs e FCM ficam no EAS (`eas credentials`).

Nos testes e2e, `PushSender` é trocado por `CapturingPushSender`, e o despachante é chamado direto com `runOnce()`.
