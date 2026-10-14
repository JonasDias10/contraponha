# Acessibilidade

O alvo é WCAG 2.2 nível AA no web e no hub, e as diretrizes equivalentes de iOS e Android no mobile.

## Como é verificado

- **Auditoria automática.** `apps/browser-tests` roda o axe nas páginas públicas e nas principais páginas logadas do web (início, descobrir, busca, notificações, salvos, editor, post, perfil e todas as configurações) e no hub, nos temas claro e escuro e numa tela de celular. Qualquer violação reprova o CI. Animações e transições são desligadas durante a auditoria para medir o contraste no estado final da página.
- **Fluxos guiados pelo que o leitor de tela enxerga.** Os testes de navegador e os fluxos do Maestro encontram elementos por papel e rótulo (`getByRole`, `getByLabel`), não por seletores de CSS. Um botão que o teste não encontra pelo nome também não é anunciado direito.
- **Revisão manual.** O axe não pega tudo: ordem de foco, anúncios de mudanças e textos alternativos ruins precisam de um teste com VoiceOver ou TalkBack antes de cada lançamento grande.

## Regras para componentes

- Todo controle tem nome acessível. Botões só com ícone recebem `aria-label` (web) ou `accessibilityLabel` (mobile); quando o texto some em telas pequenas, o rótulo continua no `aria-label`.
- Ícones decorativos usam `aria-hidden`. O selo de verificação é uma imagem com rótulo ("Verificada: Jornalista"), porque carrega informação.
- Controles segmentados (Seguindo e Descobrir, filtros, períodos) são grupos de rádio, não abas: eles filtram o conteúdo abaixo em vez de alternar painéis.
- No mobile, linhas tocáveis que agrupam vários textos definem o próprio `accessibilityLabel`, porque ele substitui o dos filhos; inclua tudo o que importa (por exemplo, o nome e o selo de verificação).
- Alternâncias (seguir, salvar, reagir) informam o estado (`aria-pressed` no web, `accessibilityState` no mobile).
- Cores vêm dos tokens do design system, que já atendem ao contraste mínimo nos dois temas; cores novas precisam passar na auditoria.

## Correções desta auditoria

- Os controles segmentados eram abas sem painéis, e cada aba apontava `aria-controls` para um elemento inexistente. Viraram grupos de rádio.
- O botão de sair do editor ficava sem nome em telas pequenas.
- A tela de confirmação de e-mail mostrava "link inválido" mesmo quando a confirmação dava certo (encontrado pelo teste de cadastro).
- No mobile, os fundos que fecham folhas e seletores passaram a ser anunciados como botões.
