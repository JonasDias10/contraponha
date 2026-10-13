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

## Processamento das imagens dos posts

Antes de gravar o post, a API baixa cada upload e o processa com o `sharp` (`renderVariants`):

1. **Orienta** a imagem pelo EXIF e **descarta todos os metadados** (câmera, data, localização GPS).
2. **Gera versões WebP** nas larguras de `MEDIA_VARIANT_WIDTHS` (640 e 1600 px), com qualidade `MEDIA_VARIANT_QUALITY` (80) e sem nunca ampliar: uma foto pequena gera menos versões. Imagens acima de 40 megapixels são recusadas (proteção contra arquivos que explodem ao descomprimir), e arquivos que não decodificam respondem `MEDIA_INVALID`.
3. Grava as versões em `posts/<dono>/<uuid>-w<largura>.webp` com `Cache-Control: public, max-age=31536000, immutable`, porque cada chave é única e nunca muda.
4. Guarda em `media_assets` a largura e a altura da imagem orientada e a lista de versões (`variants`). Depois do commit, **o original é apagado**: só as versões, sem metadados, ficam públicas.

As imagens são processadas em paralelo durante a criação do post (algumas centenas de milissegundos para quatro fotos de celular), então um post nunca aparece com imagem pendente.

`MediaView` traz `url` (a maior versão), `width`, `height` e `variants` (da menor para a maior). O web monta `srcset` e reserva o espaço com `width`/`height`, evitando que a página pule enquanto carrega; o mobile passa as versões ao `expo-image`, que escolhe a menor que serve para o tamanho da tela. Imagens antigas, de antes do processamento, continuam com a `url` do upload e `variants` vazio.

## CDN

`MEDIA_PUBLIC_BASE_URL` é a base de todas as URLs públicas. Em produção, aponte para uma CDN na frente do bucket (Cloudflare, CloudFront, Bunny ou a CDN do próprio provedor S3), com o bucket como origem e só os prefixos `posts/` e `avatars/` liberados. As versões das imagens já saem com cache imutável; para as fotos de perfil, configure na CDN um TTL longo, porque cada troca de foto gera uma chave nova.

Se a base mudar (por exemplo, ao trocar de CDN), as fotos de perfil precisam de um `UPDATE` em `users.avatar_url` (ver abaixo); as imagens de posts não, porque as URLs são montadas na leitura.

## Foto de perfil

A foto de perfil usa o mesmo upload direto, com `purpose: "avatar"` em `POST /media/uploads`:

1. O cliente recorta a imagem em quadrado e a reduz para `AVATAR_SIZE_PX` (512 px) em JPEG antes de enviar (canvas no web, `expo-image-picker` + `expo-image-manipulator` no mobile). A API aceita no máximo `AVATAR_MAX_BYTES` (1 MB).
2. A chave fica em `avatars/<id do dono>/<uuid>.<ext>`.
3. `PUT /users/me/avatar { mediaId }` confere dono, status `pending`, prefixo `avatars/`, tamanho e assinatura binária, como nos posts. Um upload de post não vira foto, e uma foto não pode ser anexada a um post.
4. Na mesma transação, a linha do usuário é atualizada primeiro (o lock serializa trocas simultâneas), a foto anterior sai de `media_assets`, a nova passa para o status `profile` e `users.avatar_url` recebe a URL pública. O objeto antigo é apagado do storage depois do commit, em melhor esforço.
5. `DELETE /users/me/avatar` remove a foto do mesmo jeito.

`avatar_url` guarda a URL completa para que todos os perfis da API (`toPublicProfile`) continuem puros, sem acesso ao storage. Se `MEDIA_PUBLIC_BASE_URL` mudar (por exemplo, ao colocar uma CDN), atualize a coluna com um `UPDATE` que troque a base. Na exclusão de conta, a foto sai com as outras mídias da pessoa e `avatar_url` volta a `null`.

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

As imagens são públicas por URL: o conteúdo de posts e as fotos de perfil já são públicos. A chave do objeto é `posts/<id do dono>/<uuid>.<ext>` ou `avatars/<id do dono>/<uuid>.<ext>`: imprevisível e sem o nome original do arquivo.

Só os prefixos `posts/` e `avatars/` são públicos (`PUBLIC_OBJECT_PREFIXES`). A política do bucket libera `GetObject` apenas neles e é reaplicada a cada inicialização, então ela sempre acompanha o código. As exportações de dados (LGPD) ficam no mesmo bucket em `exports/<id do dono>/`, sem acesso público: o download usa uma URL pré-assinada de 10 minutos, gerada só para a dona da exportação.

Como o navegador envia a imagem direto para o bucket, o CORS do bucket aceita `PUT` e `GET` vindos de `WEB_APP_URL` e de `CORS_ORIGINS`. Em produção, com `STORAGE_AUTO_CREATE_BUCKET` desligado, configure a mesma política e o mesmo CORS no provedor.
