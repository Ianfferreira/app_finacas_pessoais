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

## Núcleo financeiro — Fase 1

As entidades a seguir foram adicionadas na migration
`20260921110000_create_financial_domain.sql`. Elas ainda não possuem tela nem
upload: são a base segura para os próximos fluxos verticais.

| Entidade                      | Papel                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `institutions`                | Catálogo global somente-leitura para usuários autenticados.                                                                   |
| `categories`, `subcategories` | Taxonomia editável e isolada por usuário; perfil novo recebe as 16 categorias iniciais e subcategorias de gasto documentadas. |
| `people`                      | Pessoas de terceiros, separadas de categorias.                                                                                |
| `accounts`, `cards`           | Cadastros financeiros isolados por usuário; cartão pode apontar para uma conta de pagamento do mesmo dono.                    |
| `imports`                     | Metadados e hash de um arquivo; o binário/Storage ainda virá na fase de upload.                                               |
| `raw_records`                 | Evidência imutável de registros de uma importação. Não pode ser atualizada nem excluída, nem pelo dono.                       |
| `transactions`                | Interpretação normalizada/editável de um registro bruto, com competência, natureza, categoria, proveniência e locks manuais.  |
| `allocations`                 | Titularidade por transação: titular ou terceiro. A soma deve ser exatamente o valor da transação.                             |

Dinheiro é `numeric(18,2)` no banco e nunca `float`. Datas econômicas usam
`date`; competência é sempre o primeiro dia do mês. Todas as tabelas do usuário
têm `user_id`, RLS forçada e políticas separadas de leitura, criação, alteração
e exclusão. FKs compostas impedem uma linha de um usuário apontar para a linha
de outro.
