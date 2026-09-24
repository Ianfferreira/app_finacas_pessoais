# Sugestões de conciliação

Esta etapa acrescenta candidatos de conciliação, que são distintos de vínculos
confirmados. Um candidato preserva os dois lançamentos, a estratégia de
correspondência e os campos que coincidiram. Ele nunca altera natureza,
categoria, titularidade, valor econômico ou um vínculo existente.

## Estratégias implementadas

- Transferência própria: duas transações já interpretadas como
  `own_transfer`, entre contas diferentes marcadas como próprias, em sentidos
  opostos, mesmo valor, moeda e data de negócio.
- Estorno: uma despesa e um estorno de mesmo valor e moeda, no mesmo cartão ou
  conta, em ordem cronológica compatível.

Os critérios são determinísticos e deliberadamente restritos. Se houver mais
de uma correspondência exata, todas permanecem disponíveis para revisão; o
sistema não escolhe uma delas.

## Confirmação e descarte

Confirmar usa `create_confirmed_transaction_link`, que cria o vínculo
auditável e marca o candidato correspondente como confirmado. Descartar usa
`dismiss_reconciliation_candidate`, que só encerra aquele candidato e mantém
os demais candidatos da transação abertos.

## Limite conhecido

Pagamento de fatura ainda não recebe candidato nesta migration. O modelo
atual de vínculos é entre duas transações, enquanto um pagamento pode liquidar
uma fatura inteira, parcialmente, ou envolver antecipação. A próxima fatia
deve modelar essa relação com `card_statements` sem inventar uma equivalência
um-para-um entre pagamento e compra.
