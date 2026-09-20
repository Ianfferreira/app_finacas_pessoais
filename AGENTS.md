# Instruções do projeto

Este repositório implementa a aplicação de finanças pessoais especificada na Discovery de Ian.

Antes de qualquer implementação:

1. Leia integralmente `MASTER_SPEC.md`.
2. Leia integralmente `CODEX.md`.
3. Trate `MASTER_SPEC.md` como fonte de verdade funcional.
4. Consulte a conversa associada “Planejamento financeiro Discovery” (`6aaffa8f-4b10-83e9-a305-cced487cb32f`) somente quando os documentos não forem suficientes para esclarecer intenção ou exemplos.
5. Não invente, altere ou simplifique regras financeiras para facilitar a implementação.
6. Sinalize ambiguidades funcionais antes de implementar uma decisão que afete produto, dados ou cálculos.
7. Nunca use dados pessoais reais em código, migrations, seeds, fixtures ou testes. Use somente dados sintéticos e anonimizados.
8. Preserve a separação entre dado bruto imutável e interpretação editável.
9. Implemente incrementalmente, com migrations, Supabase RLS, testes e documentação no mesmo incremento.
10. Execute lint, typecheck, testes e build aplicáveis antes de concluir uma tarefa.

Regras operacionais detalhadas, ordem de implementação, checkpoints e definição de concluído estão em `CODEX.md`.

