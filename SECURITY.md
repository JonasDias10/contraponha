# Política de segurança

## Como relatar uma vulnerabilidade

Não abra uma issue pública. Use o relato privado do GitHub: na aba **Security** do repositório, clique em **Report a vulnerability**. Só as pessoas mantenedoras veem o relato.

Inclua, se puder:

- o que é afetado (API, web, hub ou mobile) e a versão ou o commit;
- os passos para reproduzir e o impacto que você observou;
- qualquer sugestão de correção.

Respondemos em até 5 dias úteis com uma primeira avaliação e mantemos você a par até a correção. Quando a correção for publicada, damos o crédito a você, se quiser.

## Escopo

Interessam especialmente: acesso a dados de outra conta, contorno de bloqueios, suspensões ou da verificação em duas etapas, escalada de papel (membro para moderação ou administração), injeção, SSRF na pré-visualização de links e falhas no upload de mídia.

Fora de escopo: ataques que exigem acesso físico ao aparelho, engenharia social, negação de serviço por volume e relatórios automáticos sem prova de impacto.

## Testes

Teste apenas contra uma instância local (veja o [setup](docs/development/setup.md)) ou contas suas. Não acesse, altere nem apague dados de outras pessoas e não degrade o serviço para quem o usa.
