## Por quê

<!-- Qual problema este PR resolve ou qual objetivo ele cumpre? Link para a issue/ticket, se houver. -->

## O que muda

<!-- Principais mudanças, agrupadas por área (api, web, mobile, packages, infra, docs). -->

## Decisões e alternativas

<!-- Escolhas que o revisor deve conhecer: trade-offs, o que foi descartado e por quê. Apague se não se aplicar. -->

## Como testar

<!-- Passos para reproduzir localmente, além de `pnpm test` e `pnpm test:e2e`. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm test:e2e` passam
- [ ] Código em inglês; documentação em pt-BR
- [ ] Textos de interface e de e-mail passam por `@contraponha/i18n`, com chaves em pt-BR (e `en`/`es` quando houver tradução)
- [ ] Mudança de schema tem migration gerada com nome descritivo e o SQL foi revisado
- [ ] Variáveis de ambiente novas estão no `.env.example` e no CI
- [ ] Nenhum segredo, token ou dado pessoal em código, logs ou fixtures
- [ ] Rotas novas: sessão exigida (ou `@Public()` justificado), validação com Zod e rate limit adequado
- [ ] Impacto em LGPD considerado (dados novos coletados, retenção, exclusão)
- [ ] Documentação atualizada (`README.md`, `docs/`)

## Pontos de atenção para a revisão

<!-- Onde o revisor deve olhar com mais cuidado. Apague se não se aplicar. -->
