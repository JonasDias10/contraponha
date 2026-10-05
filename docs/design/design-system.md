# Design system do Ponto

Este documento é a referência escrita do design system. As telas e os componentes desenhados estão no [canvas de design](https://claude.ai/artifact/MGbNaoNNqQcGx5bt83joKi) (acesso privado; peça para quem mantém o design); aqui ficam os tokens, as regras de uso e o porquê de cada decisão.

Componentes **não** são compartilhados entre web e mobile (veja [frontends.md](../architecture/frontends.md)). O que é compartilhado são os **tokens semânticos**, definidos com os mesmos valores em:

- web: `apps/web/src/app/globals.css` (variáveis do Tailwind 4, por exemplo `bg-surface-raised`, `text-muted`, `rounded-lg`);
- mobile: `apps/mobile/src/lib/theme.ts` (objeto de tema via `usePalette()`, chaves em camelCase).

Ao mudar um valor, mude nos dois arquivos no mesmo PR.

## Princípios e como viram interface

| Princípio               | Decisão de interface                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Leitura antes de reação | Corpo de post em serifa de leitura (Literata), coluna de até 680 px, entrelinha de 1,6 a 1,7.                                 |
| Calma, não estímulo     | `brand` só para ação e foco. Novidade é um ponto em `ink`, sem número nem vermelho. Feed termina com "Você está em dia".      |
| Reações com significado | Rótulos sempre por extenso ("Bom argumento", "Esclarecedor", "Mudou minha visão", "Precisa de fonte"). Contagens em `subtle`. |
| Transparência           | "Por que estou vendo isto", indicador "editado" com histórico público e decisão de moderação com a regra aplicada.            |
| Acessível               | Todo texto passa WCAG AA nos dois temas; alvo de toque mínimo de 44 pt; anel de foco de 2 px em `brand`.                      |
| Brasileiro e sóbrio     | Azul de caneta com um único acento quente (urucum); texto direto, sem jargão de startup.                                      |

## Cores

Valores em claro / escuro. O contraste é medido contra `surface`.

| Token (web / mobile)               | Claro     | Escuro    | Uso                                                      | Contraste   |
| ---------------------------------- | --------- | --------- | -------------------------------------------------------- | ----------- |
| `surface`                          | `#fbfbfa` | `#111317` | Fundo da página                                          | base        |
| `surface-raised` / `surfaceRaised` | `#ffffff` | `#181b20` | Cards, modais, folhas, campos                            | base        |
| `surface-sunken` / `surfaceSunken` | `#f2f3f1` | `#0b0c0f` | Busca, tags, item de navegação ativo, skeleton           | base        |
| `ink`                              | `#14161a` | `#eceef2` | Texto principal                                          | 17,5 · 16,0 |
| `muted`                            | `#5b6270` | `#a3aab6` | Texto secundário, ícones de ação                         | 5,9 · 8,0   |
| `subtle`                           | `#636a77` | `#8d94a1` | Metadados, contagens, placeholder                        | 5,3 · 6,1   |
| `line`                             | `#e3e6eb` | `#2a2e35` | Divisórias                                               | decorativo  |
| `line-strong` / `lineStrong`       | `#838a97` | `#6b7380` | Borda de campos e controles                              | 3,4 · 3,6   |
| `brand`                            | `#1f4fd8` | `#7d9cff` | Ação primária, links, foco, reação marcada               | 6,4 · 7,2   |
| `brand-soft` / `brandSoft`         | `#ebf0fd` | `#1b2442` | Fundo de reação marcada, realce de busca                 | base        |
| `on-brand` / `onBrand`             | `#ffffff` | `#0b1020` | Texto sobre `brand`                                      | 6,6 · 7,3   |
| `accent`                           | `#b3441b` | `#f0905f` | Urucum: contribuição destacada                           | 5,4 · 7,8   |
| `accent-soft` / `accentSoft`       | `#fbede6` | `#2c1c15` | Fundo da contribuição destacada                          | base        |
| `success` (+ `-soft`)              | `#1d7a4b` | `#5cc98f` | Confirmação, trecho inserido no histórico                | 5,2 · 9,0   |
| `warning` (+ `-soft`)              | `#8a5a00` | `#e3b04f` | "Precisa de fonte", contexto adicionado                  | 5,7 · 9,4   |
| `danger` (+ `-soft`)               | `#b42318` | `#ff8a7a` | Erro de formulário, ação destrutiva. Nunca em contadores | 6,4 · 8,1   |
| `on-danger` / `onDanger`           | `#ffffff` | `#1a0b09` | Texto sobre `danger`                                     | 6,6 · 8,4   |

Mantivemos o azul que já estava no código (6,4:1 sobre o fundo) e adicionamos só um acento quente, para que cor sinalize valor e não urgência. Os verdes e vermelhos anteriores do mobile (`#10b981`, `#f43f5e`) não passavam AA como texto sobre fundo claro e foram substituídos.

## Tipografia

- **Literata** (leitura): corpo e título de posts, comentários, títulos de página. Desenhada para leitura longa em tela, com eixo óptico.
- **Instrument Sans** (interface): botões, rótulos, navegação, metadados.

| Estilo     | Fonte               | Tamanho/entrelinha web | Mobile |
| ---------- | ------------------- | ---------------------- | ------ |
| display    | Literata 600        | 56/60                  | 38     |
| heading-1  | Literata 600        | 34/40                  | 28     |
| heading-2  | Literata 600        | 25/31                  | 22     |
| post-title | Literata 600        | 21/27                  | 21     |
| reading    | Literata 400        | 18/30                  | 17/28  |
| heading-3  | Instrument Sans 600 | 18/24                  | 18     |
| body       | Instrument Sans 400 | 15/22                  | 15     |
| small      | Instrument Sans 400 | 14/20                  | 14     |
| caption    | Instrument Sans 400 | 13/18 (mínimo)         | 13     |

As duas fontes ainda não são carregadas pelos apps: os tokens já apontam para elas e caem para fontes do sistema até que o carregamento (`next/font` no web, `expo-font` no mobile) seja adicionado junto com as primeiras telas reais.

## Espaço, raio e elevação

- **Espaçamento** em grade de 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Margem lateral de 16 no mobile e 32 no web.
- **Raios**: `sm` 6 (chips), `md` 10 (botões, campos), `lg` 16 (cards), `xl` 22 (modais), pílula para tags e reações.
- **Elevação**: `e1` para controles ativos, `e2` para menus e toasts, `e3` para modais e folhas. Cards do feed não têm sombra. No escuro, elevação também clareia a superfície.
- **Alvo de toque**: 44 pt. Botões de 36 px só em barras do web.

## Componentes

Base: botão (primário, secundário, quieto, fantasma, perigo; estados hover, foco, desabilitado, carregando), campo de texto (dica, erro, sucesso), seleção, opção, alternância, avatar (iniciais sobre 6 tons fixos), tag, selo, toast, modal, bottom sheet, tab bar, abas, navegação lateral, banner e estados vazio, erro e carregando.

Do Ponto:

- **Card de post**: "por que estou vendo isto", autoria com credencial curta, título opcional, corpo truncado com tempo de leitura, bloco de fonte, resumo de reações em texto e ações "Reagir", "Contribuir", "Salvar", "Compartilhar".
- **Barra de reações**: até duas reações por pessoa; não existe reação negativa genérica. "Precisa de fonte" usa `warning`.
- **Thread de contribuições**: no máximo dois níveis de recuo, linha-guia entre resposta e pergunta, destaque em urucum para contribuições que trouxeram algo novo.
- **Indicador e histórico de edição**: "editado" sublinhado pontilhado abre o histórico (folha no mobile, painel lateral no web), com motivo da edição e diff de trechos inseridos e removidos.
- **Compositor**: título opcional, corpo em Literata, fonte como bloco de primeira classe, tópicos, checklist "Antes de publicar" e escolha de quem pode contribuir.
- **Cabeçalho de perfil**: números pequenos e iguais entre si; o destaque vai para o tipo de reconhecimento recebido.

## Texto e idiomas

- pt-BR é a fonte; en e es podem ser até 30% mais longos. Barras de reação quebram linha em vez de abreviar, e botões não têm largura fixa.
- Nenhum texto de interface fica no JSX: tudo passa por `t()` com chaves de `@ponto/i18n`.
