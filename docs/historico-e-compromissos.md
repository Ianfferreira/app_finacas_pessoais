# Histórico e compromissos

## Histórico

A rota `/history` mostra valores econômicos realizados por competência. Os
filtros disponíveis são 3 meses, 6 meses, 12 meses, um ano selecionado e todo
o histórico disponível. Cada competência exibe:

- receitas;
- gastos pessoais;
- resultado (`receitas - gastos pessoais`);
- renda consumida (`gastos pessoais / receitas × 100`) apenas quando a receita
  é positiva;
- diferença absoluta do resultado contra a competência anterior;
- variação percentual do resultado contra o módulo do resultado anterior,
  apenas quando a base existe e é diferente de zero.

Quando a base anterior não existe ou é zero, a interface exibe “sem base
comparável” em vez de inventar um percentual. O estado do fechamento também é
mostrado: em andamento, fechado ou fechado com pendências. O último inclui um
alerta textual de qualidade, além do indicador visual.

O gráfico de receitas e gastos tem valores textuais para cada mês e barras que
apenas complementam a leitura. Todos os totais mensais apontam para
Movimentações com a competência preservada.

É possível selecionar uma categoria de gasto para ver a evolução mensal. Esse
cálculo considera somente alocações `self`; um estorno reduz o valor da
categoria. Cada ponto possui drill-down para a mesma competência e categoria
em Movimentações.

## Compromissos

A rota `/commitments` consulta somente parcelas com status `scheduled` e
competência a partir do mês corrente. Portanto ela não cria previsões, nem
mostra percentual de renda futura comprometida.

Os totais são consolidados por competência e separados em:

- total futuro conhecido;
- parte pessoal;
- parte de terceiros.

Se uma parcela futura não tiver `installment_allocations`, ela é apresentada
integralmente como pessoal, conforme o comportamento operacional existente.
Quando há alocações, a tela usa as partes explícitas e lista as pessoas de
terceiros associadas. O detalhe também mostra compra, posição da parcela,
competência, cartão/final quando disponíveis e os três valores. A última
parcela é marcada como encerramento do compromisso após sua competência.

## Estados e limitações

As duas telas possuem carregamento, erro acionável, estado vazio orientado ao
próximo passo e layout responsivo. Consultas são feitas em lote, respeitando a
RLS do Supabase. As barras não são a única fonte de informação: todos os
valores são apresentados em texto com formatação pt-BR.

O histórico depende das competências existentes em `monthly_metrics_history`.
Meses sem movimentações ainda não são materializados como linhas vazias. A
tela de compromissos não estima parcelas que não foram reconhecidas por uma
fatura importada.

## Roteiro de validação manual

1. Importe dados em pelo menos dois meses e abra `/history`.
2. Alterne entre 3, 6, 12 meses, ano e tudo; confira os links para
   Movimentações.
3. Feche um mês com pendências e confirme o texto de alerta no Histórico.
4. Selecione uma categoria e confirme que um estorno reduz sua evolução e que
   partes de terceiros não aparecem como gasto pessoal.
5. Importe uma compra parcelada e abra `/commitments` para conferir totais,
   competências, cartão, pessoas relacionadas e indicação da última parcela.
