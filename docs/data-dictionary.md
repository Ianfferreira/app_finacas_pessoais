# Dicionário de dados

Este dicionário acompanha somente o schema já implementado. Entidades descritas
em `MASTER_SPEC.md` mas ainda não migradas não são tratadas como existentes.

## `public.profiles`

Perfil e preferências básicas vinculados 1:1 à identidade de `auth.users`.

| Coluna         | Tipo          | Regra                                                                  |
| -------------- | ------------- | ---------------------------------------------------------------------- |
| `user_id`      | `uuid`        | PK e FK para `auth.users(id)`; cascade na exclusão da identidade       |
| `display_name` | `text`        | Opcional; entre 1 e 120 caracteres quando preenchido                   |
| `currency`     | `text`        | Código ISO 4217 de três letras; default configurável `BRL`             |
| `timezone`     | `text`        | Identificador IANA não vazio; default configurável `America/Sao_Paulo` |
| `created_at`   | `timestamptz` | Instante de criação                                                    |
| `updated_at`   | `timestamptz` | Atualizado automaticamente por trigger                                 |

RLS está habilitada e forçada. O papel `authenticated` possui políticas
separadas de `select`, `insert`, `update` e `delete`, todas limitadas a
`auth.uid() = user_id`. O papel `anon` não possui acesso à tabela.

## Núcleo financeiro — Fases 1 a 4

As entidades a seguir formam o núcleo e os incrementos de importação e
conciliação já implementados. O schema não pressupõe dados pessoais de seed.

| Entidade                      | Papel                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `institutions`                | Catálogo global somente-leitura para usuários autenticados.                                                                   |
| `categories`, `subcategories` | Taxonomia editável e isolada por usuário; perfil novo recebe as 16 categorias iniciais e subcategorias de gasto documentadas. |
| `people`                      | Pessoas de terceiros, separadas de categorias.                                                                                |
| `accounts`, `cards`           | Cadastros financeiros isolados por usuário; cartão pode apontar para uma conta de pagamento do mesmo dono.                    |
| `imports`                     | Metadados, hash SHA-256 e caminho privado do arquivo importado.                                                               |
| `raw_records`                 | Evidência imutável de registros de uma importação. Não pode ser atualizada nem excluída, nem pelo dono.                       |
| `transactions`                | Interpretação normalizada/editável de um registro bruto, com competência, natureza, categoria, proveniência e locks manuais.  |
| `allocations`                 | Titularidade por transação: titular ou terceiro. A soma deve ser exatamente o valor da transação.                             |
| `transaction_links`           | Vínculo entre duas transações do mesmo usuário, com tipo, valor, status de revisão e confirmação do usuário.                  |

Dinheiro é `numeric(18,2)` no banco e nunca `float`. Datas econômicas usam
`date`; competência é sempre o primeiro dia do mês. Todas as tabelas do usuário
têm `user_id`, RLS forçada e políticas separadas de leitura, criação, alteração
e exclusão. FKs compostas impedem uma linha de um usuário apontar para a linha
de outro.

O arquivo associado a uma importação fica no bucket privado
`financial-imports`; sua primeira pasta é o UUID do dono. A política de Storage
usa esse segmento para isolar leitura, upload, atualização e exclusão.

## Agregados econômicos autenticados

As funções `month_metrics(date)`, `monthly_metrics_history()` e
`month_category_metrics(date)` são funções de leitura executadas como o usuário
autenticado. Elas calculam gastos pessoais somente com allocations `self` e
subtraem estornos. Pagamento de fatura, transferências, investimento, resgate e
reembolsos não são agregados como renda nem como gasto pessoal.

## Rateio atômico de titularidade

`set_transaction_ownership(transaction_id, mode, allocations)` é a rotina
autenticada que grava um rateio manual de despesa ou estorno. Ela aceita um
único modo por vez: valores exatos (`amount`) ou percentuais (`percentage`).
Os percentuais devem somar exatamente 100; os centavos residuais vão, em ordem
de declaração, para as parcelas informadas primeiro.

Na mesma transação do banco, a rotina substitui as `allocations`, cria a
projeção correspondente em `third_party_entries`, resolve a pendência de
titularidade, aplica o lock manual e registra o evento de auditoria. Uma parte
de terceiro de despesa cria uma cobrança positiva (a pessoa deve ao titular); a
de um estorno cria ajuste negativo. Rateios associados a lançamentos já
liquidados não podem ser alterados, para preservar a trilha financeira.

## `public.transaction_links`

Criada em `20260921170000_create_transaction_links.sql`, esta tabela guarda
conciliações sem alterar o dado bruto. `from_transaction_id` e
`to_transaction_id` apontam, por FKs compostas, para transações do mesmo
`user_id`; uma transação não pode ser vinculada a ela mesma. `link_type` pode
ser `reversal_of`, `pays_statement`, `own_transfer_pair`,
`settles_third_party`, `duplicate_of` ou `related`.

O `amount` usa `numeric(18,2)`, `status` usa o ciclo de revisão existente e
`confirmed_by_user` registra a confirmação explícita. Há índices para busca
pelas duas pontas do vínculo e RLS forçada em todas as operações.
