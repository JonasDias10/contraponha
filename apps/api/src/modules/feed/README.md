# Módulo `feed`

> Ainda não implementado. Este arquivo define a fronteira do módulo para orientar a implementação.

Montagem do feed e do ranking de conteúdo. É onde viverá o algoritmo que privilegia relevância e qualidade de discussão. Consome sinais de outros módulos; nunca escreve nas tabelas deles.

**Depende de:** `posts`, `reactions`, `follows`, Redis (feeds materializados).
