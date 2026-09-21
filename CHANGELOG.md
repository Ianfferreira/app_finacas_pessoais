# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

## [Unreleased]

### Adicionado — Etapa 4: Naturezas e conciliação básica

- `transaction_links` para relacionar estornos, pagamentos de fatura,
  transferências próprias, liquidações de terceiros e possíveis duplicidades,
  sempre entre transações do mesmo usuário.
- RLS forçada, FKs compostas, proteção contra autorrelação e índices de busca
  para os vínculos de transação.
- Confirmação manual da natureza econômica em Movimentações, preservando a
  proveniência `manual`, a confiança máxima e um lock para essa decisão.
- Testes de não dupla contagem para pagamento de fatura, transferência,
  investimento, resgate e estorno; testes pgTAP de isolamento da nova tabela.

### Adicionado — Etapa 3: Primeiro fluxo vertical de importação

- Bucket privado, hash SHA-256, parser CSV Nubank, preview e confirmação de
  importação de extratos.
- Arquivo e linhas brutas auditáveis, interpretação inicial de transações e
  proteção contra importação duplicada do mesmo conteúdo.
- Tela de Movimentações para consultar os registros importados.

### Adicionado — Fase 1: Núcleo do domínio

- Migration forward-only para instituições, categorias, subcategorias, pessoas,
  contas, cartões, imports, registros brutos, transações e rateios.
- RLS forçada e políticas explícitas em toda tabela de dados do usuário, além
  de FKs compostas que impedem relações entre usuários distintos.
- Registros brutos imutáveis e constraint adiada que exige a conservação exata
  do valor entre uma transação e seus rateios.
- Funções puras de dinheiro em centavos, rateio determinístico e métricas
  mensais, acompanhadas de fixtures inteiramente sintéticas.
- Testes Vitest das regras financeiras iniciais e pgTAP de isolamento/RLS do
  núcleo do domínio.
- Validação em Supabase local com Docker Desktop: migrations em banco limpo,
  26 testes pgTAP e regeneração dos tipos TypeScript.

### Adicionado — Fase 0: Fundação

- Aplicação Next.js com TypeScript estrito, lint, formatação, testes e build.
- Integração SSR do Supabase Auth, cadastro, login, confirmação e logout.
- Rota protegida que lê somente o perfil do usuário autenticado.
- Migration inicial de `profiles`, trigger de criação, constraints e RLS
  explícita por operação.
- Seed inteiramente sintético e teste pgTAP de isolamento entre dois usuários.
- CI para qualidade da aplicação, replay de migrations, RLS e geração de tipos.
- Documentação de setup, dicionário de dados e decisão arquitetural da fundação.
- Conexão com Supabase online e fluxo manual de cadastro, confirmação por e-mail,
  login, perfil e logout validados.
