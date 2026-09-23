# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

## [Unreleased]

### Alterado

- A Visão Geral passou a usar o design system Terra: superfícies neutras
  quentes, verde-floresta como cor principal, tipografia editorial seletiva e
  componentes responsivos para qualidade, métricas, categorias e insights.
- A direção visual documentada agora adota Nunito Sans, Literata e a paleta
  Terra, mantendo o ocre e o vermelho para estados semânticos específicos.
- Movimentações, Revisão, Importações, Terceiros, Histórico, Compromissos,
  Regras e Configurações agora compartilham a navegação, a estrutura
  responsiva e os componentes visuais do design system Terra, preservando as
  consultas e ações de servidor existentes.

### Corrigido

- O parser CSV Nubank agora aceita valores com vírgula decimal, ponto decimal
  ou ponto de milhar. A versão 2 impede que um valor com ponto decimal seja
  multiplicado por 100 em novas importações.
- Visão Geral, Histórico e snapshots de fechamento agora calculam gastos
  pessoais pela alocação efetivamente atribuída ao titular. Estornos reduzem o
  gasto e não entram como receita, inclusive quando a direção bancária de
  origem for neutra.
- A Visão Geral agora permite navegar por competência e fechar ou reabrir o
  mês consultado, em vez de limitar a operação ao mês corrente.
- Regras de classificação agora podem ser excluídas, além de ativadas ou
  desativadas. Aplicações históricas preservam a proveniência e o valor
  aplicado, mesmo após a remoção da regra editável.

### Adicionado

- Rotina atômica de rateio manual de despesas e estornos, por valor ou
  percentual, com conservação determinística de centavos, lock de
  titularidade, resolução da revisão, auditoria e projeção automática no razão
  de terceiros. O rateio não pode ser alterado depois de uma liquidação
  relacionada.
- Qualidade mensal detalhada e versionada: fechamento com pendências passou a
  exigir confirmação explícita e o estado `closed` só é usado quando não há
  pendências de classificação, titularidade, conciliação ou duplicidade.
- Edições de natureza e vínculos confirmados na tela de Movimentações agora
  passam por rotinas auditáveis no banco, com isolamento por usuário e
  resolução explícita da pendência correspondente.

- Visão Geral com detalhamento por categoria: valores absolutos, percentuais
  calculados somente sobre os gastos já categorizados e bloco separado para
  valores ainda a revisar.
- Drill-down de categoria para Movimentações, preservando os filtros de
  competência e categoria na URL. A tela de Movimentações também informa e
  permite limpar esses filtros.
- Configurações para cadastrar e desativar pessoas, categorias, contas e
  cartões sem apagar registros já relacionados.
- Exportação manual em ZIP contendo o JSON estruturado, o CSV de
  movimentações e um aviso de privacidade. Arquivos privados e evidências
  brutas continuam fora de todas as exportações.
- O adapter de fatura Inter agora reconhece o rótulo abreviado de estorno
  usado pelo emissor antes de interpretar o sinal de crédito. Assim, um
  estorno não é importado como pagamento de fatura; a mudança está versionada
  como `inter-card-statement-pdf` v2 e coberta por fixture sintética.
- A extração de texto de PDFs agora inicializa o adaptador de canvas do
  `pdf-parse` no servidor. Isso evita o erro `DOMMatrix is not defined` no
  preview de extratos e faturas em PDF, inclusive no build de produção.
- A importação de faturas agora diferencia corretamente uma parcela de um
  campo JSON nulo, preservando compras à vista no mesmo documento.

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
