# Checkpoint integrado — V1 local

Data: 2026-09-23

## O que está verificável localmente

- Importação manual com adapters explícitos para os formatos suportados,
  prévia, hash, arquivo privado, registros brutos imutáveis e idempotência.
- Cartões, faturas, parcelas realizadas e futuras, pagamentos de fatura e
  estornos separados do gasto econômico.
- Regras classificatórias editáveis, desativáveis e excluíveis; aplicações
  passadas continuam auditáveis após a exclusão da regra.
- Revisão de categoria/natureza e reprocessamento que respeita locks manuais.
- Terceiros, razão e reembolsos, além de compromissos futuros por parcela.
- Visão Geral e Histórico calculados com a parcela `self` das allocations;
  estorno reduz gasto e não se torna receita.
- Fechamento mensal por competência, com reabertura e snapshots versionados.
- Configurações essenciais e exportação manual em JSON, CSV ou ZIP sem PDFs,
  registros brutos ou credenciais.

## Migrations novas deste checkpoint

- `20260923100000_fix_personal_financial_metrics.sql`: funções de métricas
  econômicas autenticadas e snapshot de fechamento baseado em allocations.
- `20260923101000_allow_rule_deletion_with_audit_history.sql`: exclusão de
  regras sem apagar a proveniência das aplicações anteriores.

## Validações executadas

- `pnpm db:reset`
- `pnpm db:test` — 55 testes pgTAP/RLS aprovados
- `pnpm db:types`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 40 testes unitários aprovados
- `pnpm build` — 14 rotas compiladas

## Próxima validação manual segura

No ambiente local, com dados sintéticos, valide: regra criada/desativada,
reembolso parcial, fechamento/reabertura de um mês e download do ZIP. Em dados
reais, valide primeiro a importação e a revisão; nunca adicione documentos ou
credenciais ao repositório.

## Ambiente online

Nenhuma migration deste checkpoint foi aplicada online. Antes de usar a Visão
Geral e o Histórico atualizados no projeto Supabase online, aplique as duas
migrations acima em ordem, uma única vez, pelo SQL Editor ou fluxo de migration
que você controlar. Em seguida, teste os fluxos reais manualmente sem versionar
documentos financeiros.
