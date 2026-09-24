# Decisão manual de categoria

`set_transaction_category_manual` é a única rotina de gravação destinada à
decisão manual de categoria. Ela verifica usuário, natureza econômica e tipo
da categoria; atribui proveniência manual, confiança máxima e lock de
categoria; resolve a pendência correspondente e registra auditoria.

Ao trocar a categoria, a subcategoria anterior é removida para não preservar
uma relação que possa pertencer à categoria antiga. A evidência de origem não
é modificada.

Categorias de despesa são permitidas para `expense` e `reversal`; categorias
de receita são permitidas para `income` e `investment_income`. Transferências,
pagamentos de fatura, investimentos, resgates e demais naturezas sem
finalidade econômica categorizável não aceitam categoria.
