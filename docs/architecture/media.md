# Mídia

Posts aceitam até `MEDIA_MAX_PER_POST` (4) imagens JPEG, PNG ou WebP de até `MEDIA_MAX_BYTES` (5 MB). Os arquivos vão direto do cliente para um storage compatível com S3; a API nunca recebe os bytes.

## Fluxo de upload

```text
cliente                         API                              storage (S3)
   │ POST /media/uploads           │                                   │
   │ { mimeType, sizeBytes } ─────▶│ cria media_assets (pending)       │
   │◀──── { mediaId, uploadUrl,    │ assina PUT (10 min)               │
   │        headers, expiresAt }   │                                   │
   │ PUT uploadUrl (headers) ─────────────────────────────────────────▶│
   │ POST /posts { body,           │                                   │
   │   mediaIds: [...] } ─────────▶│ verifica cada mídia ─── HEAD ────▶│
   │                               │                    ── leitura ───▶│ (primeiros bytes)
   │                               │ anexa ao post (mesma transação)   │
```

1. `POST /media/uploads` valida tipo e tamanho e devolve uma URL de `PUT` pré-assinada, válida por `MEDIA_UPLOAD_URL_TTL_MINUTES` (10). A assinatura inclui `Content-Type` e `Content-Length`: o storage recusa (403) um arquivo maior ou de outro tipo do que o declarado.
2. O cliente envia o arquivo com os `headers` devolvidos.
3. Ao criar o post com `mediaIds`, a API confere, para cada id: dono, status `pending`, tamanho real (`HEAD`) e **assinatura binária** (magic bytes de JPEG, PNG ou WebP). Um HTML renomeado para `.png` é recusado com `MEDIA_INVALID`.
4. As mídias são anexadas ao post na mesma transação, na ordem enviada. Uma mídia não pode ser reutilizada.

Ao remover um post (pelo autor ou pela moderação), as linhas de `media_assets` são apagadas na transação e os objetos são apagados do storage **depois do commit**, em melhor esforço: se o storage falhar, o post continua removido e o objeto fica órfão (um job de limpeza resolve isso quando existir).

Uploads `pending` nunca anexados também ficam para esse job de limpeza.

## Storage

A aplicação depende da classe abstrata `ObjectStorage` (`src/infrastructure/storage/`), implementada por `S3ObjectStorage` com o SDK oficial da AWS. Qualquer provedor compatível com S3 serve, inclusive os que têm região no Brasil; basta trocar as variáveis:

| Variável                     | Uso                                                               |
| ---------------------------- | ----------------------------------------------------------------- |
| `STORAGE_ENDPOINT`           | URL do serviço S3                                                 |
| `STORAGE_REGION`             | Região (o RustFS aceita qualquer valor)                           |
| `STORAGE_BUCKET`             | Bucket da mídia                                                   |
| `STORAGE_ACCESS_KEY_ID`      | Credencial                                                        |
| `STORAGE_SECRET_ACCESS_KEY`  | Credencial                                                        |
| `STORAGE_FORCE_PATH_STYLE`   | `true` para storages que não usam subdomínio por bucket           |
| `STORAGE_AUTO_CREATE_BUCKET` | Cria o bucket público na inicialização (ignorado em produção)     |
| `MEDIA_PUBLIC_BASE_URL`      | Base das URLs públicas das imagens (bucket ou CDN na frente dele) |

Em desenvolvimento e no CI o storage é o [RustFS](https://rustfs.com), compatível com S3, no docker-compose (API em `:9000`, console em `:9001`). As imagens do MinIO deixaram de ser publicadas no Docker Hub, por isso a troca.

As imagens são públicas por URL: o conteúdo de posts já é público. A chave do objeto é `posts/<id do dono>/<uuid>.<ext>`: imprevisível e sem o nome original do arquivo.

Só o prefixo `posts/` é público. A política do bucket libera `GetObject` apenas nele e é reaplicada a cada inicialização, então ela sempre acompanha o código. As exportações de dados (LGPD) ficam no mesmo bucket em `exports/<id do dono>/`, sem acesso público: o download usa uma URL pré-assinada de 10 minutos, gerada só para a dona da exportação.

Como o navegador envia a imagem direto para o bucket, o CORS do bucket aceita `PUT` e `GET` vindos de `WEB_APP_URL` e de `CORS_ORIGINS`. Em produção, com `STORAGE_AUTO_CREATE_BUCKET` desligado, configure a mesma política e o mesmo CORS no provedor.
