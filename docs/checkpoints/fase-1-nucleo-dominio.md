# Checkpoint — Fase 1: Núcleo do domínio

Data: 2026-09-21

## O que existe nesta entrega

- Schema versionado para cadastro financeiro, importações/metadados, evidência
  bruta, transações interpretadas e rateios.
- Isolamento por usuário no banco e proteção de relações filho/pai entre
  usuários distintos.
- Regras puras, sem React ou Supabase, para dinheiro em centavos, rateio e
  métricas mensais com fixture inteiramente sintética.

## Regras da especificação cobertas

- categoria, natureza e titularidade são dimensões independentes;
- terceiros são uma parte de um rateio, nunca uma categoria;
- rateios preservam centavos e devem somar exatamente a transação;
- pagamento de fatura, aplicação, resgate e transferência própria não alteram
  receita nem gasto econômico;
- estorno reduz gasto pessoal;
- dados brutos permanecem imutáveis e separados de interpretação;
- valores usam precisão decimal no banco e não usam `float`.

## Migrations e impacto

`20260921110000_create_financial_domain.sql` é uma migration nova e não altera
os perfis existentes. Ela ainda precisa ser aplicada ao projeto Supabase online
antes de qualquer tela que leia essas tabelas.

## Verificações executadas

- Vitest: cálculo de métricas, não dupla contagem, estorno e rateio 50/50 com
  centavo residual.
- pgTAP: usuário A não enxerga, edita nem apaga evidência/transações do usuário
  B; o dono também não consegue reescrever dado bruto.
- `pnpm check`: passou — Prettier, ESLint, TypeScript, 19 testes Vitest e build
  de produção.
- `pnpm db:start`: não executou as migrations/testes pgTAP porque este
  computador não possui Docker Desktop nem Podman no `PATH`.

## Limitações deliberadas

Não há UI de configurações, upload privado, parser, hash calculado pela
aplicação, deduplicação executável, regras, pessoas em razão, conciliação ou
dashboard. Isso evita apresentar uma função de produto como pronta antes do
primeiro fluxo de importação vertical.

## Próximo incremento

Etapa 3: Storage privado, upload, SHA-256, parser Nubank CSV sintético, preview
e confirmação idempotente para criar `imports`, `raw_records`, `transactions`
e suas alocações.
