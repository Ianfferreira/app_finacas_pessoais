# ADR 0002 — Dinheiro exato e fronteira entre evidência e interpretação

Data: 2026-09-21

## Contexto

O produto precisa preservar arquivos e lançamentos brutos como evidência, mas
permitir correções auditáveis de categoria, natureza e titularidade. Também não
pode perder centavos em rateios ou métricas.

## Decisão

- O PostgreSQL armazena magnitudes monetárias em `numeric(18,2)`, nunca em
  `float`.
- O domínio TypeScript trabalha com centavos em `bigint`; conversão de texto
  decimal é explícita e não usa ponto flutuante.
- `raw_records` é imutável: uma interpretação nova cria/usa dados derivados,
  sem reescrever a evidência original.
- `transactions` representa interpretação editável e `allocations` representa
  titularidade. Um trigger adiado confirma no commit que os rateios somam o
  valor da transação, permitindo gravar ambas em uma única operação atômica.
- Centavos residuais de rateio percentual são distribuídos pela ordem declarada
  das partes. A interface deverá deixar essa ordem/resultante visível.

## Consequências

Os cálculos ficam reproduzíveis e as futuras telas podem editar interpretação
sem apagar a origem. Inserções de transações precisam incluir seus rateios na
mesma transação SQL. O upload e os parsers continuam fora deste incremento.
