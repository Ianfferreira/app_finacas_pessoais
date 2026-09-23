# Catálogo de parsers

Os parsers abaixo são adapters explícitos: eles só aceitam o contrato de
arquivo que reconhecem e retornam um diagnóstico em vez de tentar interpretar
silenciosamente um formato desconhecido. O arquivo original e os registros
brutos permanecem como evidência; a saída do parser é uma interpretação
versionada.

| Instituição/produto | Formato | Parser                       | Versão atual | Cobertura relevante                                                      |
| ------------------- | ------- | ---------------------------- | ------------ | ------------------------------------------------------------------------ |
| Nubank, conta       | CSV     | `nubank-statement-csv`       | 2            | Extrato bancário; aceita vírgula ou ponto decimal.                       |
| Nubank, conta       | PDF     | `nubank-statement-pdf`       | 1            | Extrato bancário.                                                        |
| Nubank, cartão      | PDF     | `nubank-card-statement-pdf`  | 1            | Compras, parcelas, estornos e pagamentos.                                |
| Caixa, cartão       | PDF     | `caixa-card-statement-pdf`   | 1            | Múltiplos cartões, parcelas e créditos.                                  |
| Inter, cartão       | PDF     | `inter-card-statement-pdf`   | 2            | Cartões múltiplos, parcelas, pagamentos e rótulos abreviados de estorno. |
| Rico/XP, cartão     | CSV     | `rico-xp-card-statement-csv` | 1            | Compras, parcelas e pagamentos.                                          |

Um aumento de versão identifica uma mudança no comportamento do adapter; ele
não altera registros brutos nem reescreve decisões manuais já salvas.
