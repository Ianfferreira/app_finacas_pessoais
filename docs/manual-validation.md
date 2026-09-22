# Validação manual local

Execute estes fluxos com o Supabase local e dados sintéticos. Nunca use este
documento para registrar e-mails, extratos, documentos ou valores reais.

## Fluxos verificados em 2026-09-22

- Autenticação local com perfil isolado por RLS.
- Visão Geral sem dados financeiros: estados vazios e base de renda inválida.
- Cadastro de uma pessoa sintética em Configurações.
- Razão de terceiros: débito sintético de R$ 50,00 seguido de reembolso parcial
  de R$ 20,00, resultando em saldo a receber de R$ 30,00.
- Fechar e reabrir o mês atual, preservando a versão `v1` do fechamento.
- Navegação para Histórico, Compromissos, Revisão, Regras e Configurações.
- Links de exportação JSON e CSV estruturados. A interface declara e a rota
  garante que arquivos privados e `raw_records` não sejam incluídos.

## Ainda necessário antes do Supabase online

1. Aplicar **uma única vez** a sequência de migrations localmente consolidada
   no projeto online, somente após revisão humana.
2. Regenerar tipos contra o banco online aplicado.
3. Testar importações reais sem adicionar os arquivos ao repositório.
4. Fazer o commit local e então deixar o push para o proprietário do repositório.
