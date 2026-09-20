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
