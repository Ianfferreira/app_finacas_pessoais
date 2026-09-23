# Validação manual local

Execute estes fluxos com o Supabase local e dados sintéticos. Nunca use este
documento para registrar e-mails, extratos, documentos ou valores reais.

## Fluxos verificados em 2026-09-22

- Autenticação local com perfil isolado por RLS.
- Visão Geral sem dados financeiros: estados vazios e base de renda inválida.
- Cadastro de uma pessoa sintética em Configurações.
- Razão de terceiros: débito sintético de R$ 50,00 seguido de reembolso parcial
  de R$ 20,00, resultando em saldo a receber de R$ 30,00.
- Fechar e reabrir o mês atual, preservando a versão `v1` do fechamento.
- Navegação para Histórico, Compromissos, Revisão, Regras e Configurações.
- Links de exportação JSON, CSV e ZIP estruturados. A interface declara e a
  rota garante que arquivos privados e `raw_records` não sejam incluídos.
- Visão Geral com categorias, valor em R$, percentual sobre o gasto já
  categorizado, valores "A revisar" separados e abertura do drill-down em
  Movimentações filtradas pela competência e categoria.

## Rateio de titularidade — a validar quando a interface estiver conectada

1. Crie duas pessoas sintéticas e importe/crie uma despesa sintética de
   R$ 100,01.
2. Atribua 50% ao titular, 25% a cada pessoa, nessa ordem. O titular deve ficar
   com R$ 50,01; os dois centavos residuais seguem a ordem declarada.
3. Confira que a Visão Geral considera só R$ 50,01 como gasto pessoal e que o
   razão de cada pessoa recebeu R$ 25,00 a receber.
4. Edite o mesmo rateio por valores exatos e confirme que não restou uma
   cobrança duplicada no razão, que a revisão de titularidade foi resolvida e
   que há evento de auditoria.
5. Depois de registrar uma liquidação contra essa cobrança, tente mudar o
   rateio. A operação deve ser bloqueada até que a liquidação seja tratada; ela
   nunca pode apagar silenciosamente uma baixa financeira.

## Fechamento seguro — a validar quando a confirmação estiver na interface

1. Deixe uma despesa sintética sem categoria ou titularidade confirmada e abra
   a qualidade do mês: a quantidade e o valor afetados devem aparecer.
2. Tente fechar sem confirmar. O banco deve recusar a operação.
3. Confirme o fechamento com pendências; o estado deve ser
   `closed_with_pending` e guardar o retrato de qualidade em uma versão.
4. Resolva as pendências, feche novamente sem confirmação e confira o estado
   `closed` em uma nova versão, sem apagar a anterior.

## Ainda necessário antes do Supabase online

1. Aplicar **uma única vez** a sequência de migrations localmente consolidada
   no projeto online, somente após revisão humana.
2. Regenerar tipos contra o banco online aplicado.
3. Testar importações reais sem adicionar os arquivos ao repositório.
4. Fazer o commit local e então deixar o push para o proprietário do repositório.
