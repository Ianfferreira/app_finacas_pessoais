# Pagamentos de fatura

Pagamento de cartão é fluxo de caixa, não uma nova despesa. Esta relação
registra qual parte de uma transação de natureza `card_payment` liquidou qual
fatura, sem duplicar as compras que já foram reconhecidas economicamente.

## Modelo mínimo

`card_statement_payment_allocations` guarda somente:

- a fatura;
- a transação de pagamento;
- o valor explicitamente conciliado.

Um pagamento pode ser dividido entre faturas e uma fatura pode receber mais de
um pagamento. O valor alocado nunca pode superar o valor da transação de
pagamento. Quando a fatura tem total positivo documentado, a soma também não
pode superá-lo.

Fatura com total a pagar zero não bloqueia a alocação: esse é o caso de uma
antecipação já identificada pelo documento. A operação continua manual e
auditável.

## Revisão

Todo `card_payment` sem alocação integral abre uma pendência independente de
conciliação. Registrar ou remover uma alocação atualiza somente essa pendência;
não altera categoria, compras, parcelas ou métricas econômicas.
