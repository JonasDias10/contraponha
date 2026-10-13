# Tempo real

O web e o mobile recebem eventos por **Server-Sent Events** (SSE). SSE foi escolhido em vez de WebSocket porque o fluxo é só do servidor para o cliente, passa por proxies e CDNs comuns como HTTP normal e o navegador reconecta sozinho.

| Rota                        | Eventos                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `GET /events`               | `notifications.changed` (com o total de não lidas), `feed.new_post` |
| `GET /posts/:postId/events` | `post.new_comment`, para a discussão aberta                         |

Os dois exigem sessão. Cada mensagem é um JSON `RealtimeEvent` (`@contraponha/types`), validado no cliente por `realtimeEventSchema`. Um evento `heartbeat` a cada 25 s mantém a conexão viva atrás de proxies.

## Como os eventos nascem

```text
post criado / contribuição criada / notificação visível
            │ (depois do commit)
            ▼
      RealtimeBus.publish ──▶ Redis pub/sub ──▶ cada instância da API
                                                  │ fan-out em memória
                                                  ▼
                                      conexões SSE abertas nela
```

- **Redis pub/sub** faz os eventos chegarem a todas as instâncias da API; cada uma só entrega às suas próprias conexões. Publicar é melhor esforço: um evento perdido só atrasa o que o próximo refetch já mostraria.
- **Posts novos** vão para quem segue o autor. Cada conexão guarda quem a pessoa segue (recarregado a cada minuto) e ignora autores bloqueados ou silenciados.
- **Contribuições novas** vão para quem está com o post aberto, menos o próprio autor e quem bloqueou ou silenciou o autor.
- **Notificações** são avisadas pelo mesmo despachante do push (`PushDispatchService`, a cada 5 s), quando ficam visíveis: na hora ou no horário de resumo. Ele roda sempre que `BACKGROUND_JOBS_ENABLED` está ligado; `PUSH_ENABLED` só controla o envio de push.

## Nos clientes

- O transporte é de cada app, pelo `openStream` do `ClientContext`: `EventSource` no web (pelo proxy `/api/v1`, que repassa o stream e fecha a conexão com a API quando o navegador sai) e `react-native-sse` no mobile (com o token no cabeçalho).
- O resto é comum, em `@contraponha/client-core/react`: `useRealtimeStream` (montado uma vez no app), `usePostRealtime` (na página do post), `usePendingFeedPosts` e `usePendingComments`.
- Os eventos só mexem no cache. O contador de não lidas muda na hora; as listas mostram um aviso ("3 posts novos", "2 contribuições novas") e só recarregam quando a pessoa toca nele, para a página não pular embaixo de quem está lendo.
