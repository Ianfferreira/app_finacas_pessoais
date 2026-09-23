# MASTER_SPEC — Finanças Pessoais

Versão: 1.0  
Status: fonte de verdade funcional para a V1  
Origem: Discovery “Planejamento financeiro Discovery” (`6aaffa8f-4b10-83e9-a305-cced487cb32f`)  
Usuário inicial: Ian, sem hardcode de identidade ou dados pessoais

## 1. Finalidade deste documento

Este documento especifica o produto, as regras financeiras, a experiência, a arquitetura e os critérios de aceite da V1. Em caso de conflito entre uma conveniência de implementação e este documento, este documento prevalece. O histórico da Discovery serve para esclarecer exemplos e intenção; decisões explícitas desta especificação prevalecem sobre propostas intermediárias discutidas durante a Discovery.

Os arquivos reais e o fechamento experimental de agosto/2026 são somente casos de homologação. Nomes, valores, contas, cartões, merchants e relacionamentos encontrados nesses materiais não podem ser inseridos no código, seeds de produção, migrations ou regras globais como dados do Ian.

## 2. Visão do produto

Uma aplicação web pessoal de inteligência financeira que consolida extratos bancários e faturas de múltiplas instituições, separa movimentação financeira de realidade econômica e responde rapidamente:

- quanto foi efetivamente recebido como renda;
- quanto foi gasto pessoalmente;
- para onde foi o dinheiro, em valores absolutos e percentuais;
- quanto sobrou no mês;
- que parte das movimentações pertence a terceiros;
- quais valores continuam a receber, pagar ou compensar com terceiros;
- quais parcelas já contratadas comprometem meses futuros;
- como os resultados evoluem ao longo do tempo;
- quais dados ainda precisam de revisão e quanto se pode confiar nos números.

O produto não deve ser uma planilha ornamentada nem um banco digital. Deve ser calmo, auditável, progressivamente mais automático e útil mesmo antes de o mês estar totalmente revisado.

## 3. Objetivos e princípios

### 3.1 Objetivos da V1

1. Consolidar contas e cartões de instituições diferentes em um modelo interno único.
2. Preservar o dado bruto e produzir uma interpretação editável e auditável.
3. Evitar dupla contagem de compras, pagamentos de fatura, transferências, aplicações, resgates, estornos e reembolsos.
4. Apurar receitas, gastos pessoais, resultado e renda consumida por mês de competência.
5. Categorizar automaticamente o que for conhecido e levar apenas exceções à revisão.
6. Separar categoria, natureza econômica e titularidade/rateio.
7. Acompanhar terceiros como uma conta corrente por pessoa, sem tratá-los como categoria.
8. Exibir histórico realizado e compromissos financeiros conhecidos, sem previsão probabilística.
9. Operar nas funções essenciais usando tiers gratuitos e sem API paga obrigatória.
10. Nascer multi-user ready, mesmo que inicialmente só Ian use o sistema.

### 3.2 Princípios obrigatórios

- Valor absoluto e percentual aparecem juntos quando o percentual tiver significado.
- Categoria responde “com que finalidade?”; titularidade responde “de quem é?”; natureza responde “o que economicamente aconteceu?”. São dimensões independentes.
- Entrada bancária não é necessariamente receita; saída bancária não é necessariamente gasto.
- Pagamento de cartão não cria novo gasto.
- Aplicação e resgate não são consumo nem renda. Rendimentos efetivamente recebidos podem ser receita.
- Terceiros não são categoria financeira.
- Correção manual vence qualquer automação.
- Regra manual criada pelo usuário vence regra global, heurística ou sugestão.
- Regras são explicáveis, editáveis, desativáveis e excluíveis.
- Automação incerta sugere; não inventa.
- Dado bruto é imutável. Reprocessar cria ou atualiza interpretação, nunca falsifica a origem.
- Todo número agregado deve permitir chegar às transações que o compõem.
- O dashboard está disponível antes do fechamento e marca números incompletos como preliminares.
- “A revisar” é um estado legítimo, não um erro.
- Fechamento é reversível: mês pode ser reaberto, recalculado e fechado novamente.
- Exclusões e alterações destrutivas exigem confirmação e, quando possível, trilha de auditoria.
- Insights são descritivos, não moralizantes nem prescritivos.

## 4. Escopo

### 4.1 Incluído na V1

- autenticação por e-mail e senha;
- cadastro de instituições, contas, cartões e identificação de contas próprias;
- importação manual de CSV e PDF;
- adapters/parsers por instituição, produto e formato;
- armazenamento opcional do arquivo original privado, metadados e hash sempre preservados;
- normalização de lançamentos, merchants e parcelas;
- deduplicação de arquivo e transação;
- categorização, natureza econômica, titularidade e rateio;
- regras determinísticas e sugestões não obrigatórias;
- revisão por exceção;
- conciliação assistida de pagamentos, estornos, transferências próprias e reembolsos;
- dashboard mensal preliminar ou fechado;
- movimentações consolidadas;
- terceiros, saldos e liquidações parciais;
- histórico realizado;
- compromissos futuros conhecidos por parcelas;
- fechamento mensal reversível;
- exportação dos dados do usuário;
- isolamento multiusuário com `user_id` e RLS.

### 4.2 Fora de escopo da V1

- orçamento mensal por categoria;
- metas financeiras;
- patrimônio líquido e gestão detalhada de investimentos/rentabilidade;
- Open Finance e sincronização bancária automática;
- previsão probabilística de renda ou gastos;
- percentual da renda futura comprometida;
- IA paga ou IA como dependência essencial;
- score financeiro ou recomendações do tipo “você deveria gastar menos”;
- notificações complexas;
- dark mode;
- aplicativo nativo;
- compartilhamento de finanças entre usuários;
- planos, cobrança, assinatura ou administração SaaS;
- classificação fixa/variável e essencial/discricionária como requisito da V1;
- backup automático externo. Exportação manual é obrigatória; automação pode vir depois.

## 5. Modelo financeiro canônico

### 5.1 As três dimensões de uma movimentação

Cada transação interpretada possui, de forma independente:

1. **Direção financeira:** entrada, saída ou neutra/ajuste.
2. **Natureza econômica:** receita, gasto, transferência própria, pagamento de fatura, investimento, resgate, estorno, terceiro/reembolso, empréstimo, rendimento, ajuste ou não classificada.
3. **Finalidade e titularidade:** categoria/subcategoria e alocações entre o titular e pessoas.

Uma transação pode ter categoria conhecida e titularidade pendente, ou titularidade conhecida e categoria pendente.

### 5.2 Métricas principais

- **Receitas:** soma de parcelas econômicas classificadas como receita na competência, excluindo transferências próprias, reembolsos, empréstimos recebidos, resgates e estornos.
- **Gastos pessoais:** soma das alocações atribuídas ao titular em transações de gasto, líquida de estornos vinculados, na competência.
- **Resultado:** `receitas - gastos pessoais`.
- **Renda consumida:** `gastos pessoais / receitas * 100`, somente quando receitas forem positivas; caso contrário mostrar “não aplicável”.
- **Percentual da categoria:** `gasto pessoal da categoria / gastos pessoais categorizados * 100`. “A revisar” aparece separado e informa valor e participação sobre os gastos pessoais capturados, sem fingir ser categoria econômica.
- **Fluxo bancário bruto:** entradas e saídas efetivas das contas. É preservado para conciliação e detalhamento, mas não substitui as métricas econômicas principais.
- **Saldo com terceiro:** razão entre valores atribuídos ao terceiro, créditos, pagamentos, reembolsos e demais ajustes confirmados. Sinal e rótulo devem deixar claro “a receber” ou “crédito/a pagar”.

Comparações históricas exibem diferença em R$ e variação percentual. Percentual não deve ser calculado quando a base anterior for zero; mostrar “sem base comparável”.

### 5.3 Competência temporal

- A análise principal é econômica por competência, não pela data de liquidação da conta bancária.
- Compra à vista pertence ao mês da data da transação/compra.
- Compra parcelada reconhece apenas a parcela de cada mês. Nunca lança o valor integral como gasto no mês original.
- Para parcela exibida numa fatura com data original antiga, armazenar separadamente `purchase_date` e `installment_competence`. A parcela pertence à competência da fatura/ciclo que a contém, mesmo que a descrição repita a data da compra original.
- Quando a fonte fornecer datas de fechamento, vencimento ou período, preservá-las. Elas servem à conciliação, não para sobrescrever a data original.
- Pagamento da fatura pertence ao caixa na data em que ocorreu, mas tem natureza `card_payment` e impacto econômico zero.
- Receitas pertencem à data/competência econômica confirmada. Uma transferência de conta própria pode ser marcada como receita centralizada quando o extrato da conta de origem não está presente; se ambos os lados forem importados, a receita deve existir uma única vez.
- A titularidade da conta não determina a natureza. Uma entrada originada em outra conta do próprio usuário pode ser transferência ou receita centralizada.
- Fechamentos agregam por `competence_month`, não pelo nome comercial da fatura.

### 5.4 Regras por natureza

#### Receita

Inclui salário, bolsa, mesada, trabalho, presente ou outra entrada que aumente recursos econômicos do usuário. Pode possuir subcategoria. Repasse, reembolso, devolução de empréstimo, resgate e transferência própria não são receita.

#### Gasto

É consumo ou obrigação econômica. Só a parte atribuída ao titular entra em gastos pessoais. A parcela de terceiro preserva a mesma categoria, mas alimenta o razão de terceiros.

#### Transferência própria

Movimento entre contas do usuário, impacto econômico zero. Pode ser conciliada por valor, data, origem/destino e referências. Nunca classificar automaticamente apenas porque o nome/CPF parece do usuário; sugerir quando houver evidência e permitir regra contextual.

#### Investimento e resgate

Aplicação reduz caixa disponível, mas não é gasto. Resgate aumenta caixa, mas não é receita. Rendimento destacado separadamente pode ser receita de rendimento. A V1 não calcula rentabilidade nem patrimônio.

#### Pagamento de fatura

É liquidação de compras já reconhecidas. Deve ser conciliável com a fatura por instituição, cartão/conta, valor e janela de data. Antecipações e fatura com valor a pagar zero não eliminam os gastos individuais do ciclo.

#### Estorno

Reduz o gasto relacionado. Sempre que possível, criar vínculo explícito entre transação e estorno. Correspondência exata pode ser sugerida automaticamente; ambiguidades vão para revisão. Estorno não é receita.

#### Empréstimo

- Empréstimo concedido: não é gasto; cria valor a receber da pessoa.
- Devolução: não é receita; reduz o saldo a receber.
- Empréstimo recebido: não é receita; cria obrigação com a pessoa.
- Pagamento do principal: não é gasto de consumo; reduz a obrigação.
- Juros, se identificados, podem ser gasto ou receita em categoria apropriada.

#### Terceiros, reembolsos e rateios

- Uma transação é 100% do titular por padrão operacional, mas uma automação não pode confirmar silenciosamente titularidade quando houver dúvida relevante.
- O usuário pode alocar por valor absoluto ou percentual entre titular e uma ou mais pessoas.
- A soma dos valores deve ser exatamente igual ao valor absoluto da transação. Arredondamento residual de centavos deve ser explícito e determinístico.
- A parte do terceiro não entra em gasto pessoal e cria lançamento no razão da pessoa.
- Uma entrada de pessoa conhecida pode sugerir reembolso, mas nunca baixar saldo silenciosamente na V1.
- Reembolso pode liquidar total ou parcialmente um ou vários lançamentos.
- Se recebido for menor, permanece saldo. Se maior, o excedente deve ser classificado pelo usuário como receita, outro reembolso, crédito da pessoa ou pendente.
- Crédito de terceiro pode ser consumido por despesas futuras da mesma pessoa.
- O modelo também suporta o sentido inverso: usuário deve à pessoa.
- Relacionamento (pai, mãe, irmã, parceiro, amigo) é metadado e nunca determina natureza.

## 6. Taxonomia inicial

As categorias são editáveis por usuário, mas a V1 inicia com nove macros estáveis. Merchants não são subcategorias.

| Categoria | Subcategorias iniciais sugeridas |
|---|---|
| Moradia | Aluguel/condomínio, contas da casa, manutenção, móveis, construção |
| Alimentação | Mercado, restaurante, delivery, café/lanche |
| Transporte | Aplicativo, transporte público, combustível, estacionamento, manutenção |
| Saúde & Bem-estar | Farmácia, consultas, plano de saúde, academia/fitness, ótica |
| Educação & Desenvolvimento | Cursos, livros, certificações, faculdade |
| Lazer & Viagens | Eventos, entretenimento, hospedagem, passagens, turismo |
| Compras | Vestuário, eletrônicos, casa, itens pessoais, e-commerce/compras gerais |
| Serviços & Assinaturas | Telefonia, streaming, software, clubes/assinaturas, serviços profissionais |
| Outros | Somente gastos confirmados que não se encaixam nas demais |

Receitas possuem taxonomia própria inicial: salário, bolsa, trabalho/renda extra, mesada, rendimentos, presente e outras receitas. `A revisar` é status, não categoria. `Terceiros`, `Transferência`, `Investimento` e `Pagamento de fatura` são naturezas, não categorias.

## 7. Merchants, regras, confiança e revisão

### 7.1 Normalização de merchant

Guardar sempre a descrição original. Em campo separado, normalizar caixa, acentos apenas quando útil para matching, sufixos de filial, tokens de pagamento e variações conhecidas. Exemplos como `UBER *TRIP`, `Uber - NuPay` e `UBER DO BRASIL` podem apontar para o merchant canônico `Uber`. O alias guarda origem e padrão usado; nenhuma normalização deve apagar o texto bruto.

### 7.2 Tipos de regra

- merchant/normalização;
- categoria/subcategoria;
- natureza econômica;
- titularidade/rateio;
- competência, apenas quando necessária para um formato conhecido;
- conciliação/sugestão, sem baixa silenciosa.

Condições podem combinar descrição, merchant, pessoa/origem, instituição, conta/cartão, direção, faixa de valor, recorrência, portador e outros campos estáveis. Regras excessivamente amplas devem ser evitadas.

### 7.3 Precedência

Da maior para a menor autoridade:

1. edição manual na transação;
2. regra ativa criada pelo usuário, ordenada por prioridade e especificidade;
3. mapeamento do merchant confirmado pelo usuário;
4. regra global/versionada da aplicação para padrões determinísticos;
5. heurística do adapter/parser;
6. sugestão inteligente opcional;
7. pendente de revisão.

Uma correção individual não altera uma regra existente automaticamente. Após editar, oferecer: “somente esta”, “semelhantes deste mês” ou “criar regra”. Reprocessamento não pode sobrescrever campos bloqueados por decisão manual.

### 7.4 Confiança e explicabilidade

Cada dimensão interpretada armazena fonte, confiança e regra aplicada. Estados conceituais: `confirmed`, `high`, `medium`, `low`, `unknown`. Confiança não precisa aparecer como número; a interface pode usar conhecido, sugerido e revisar. Toda classificação deve explicar sua origem.

Pendências são independentes: categoria, titularidade, natureza, competência, conciliação ou duplicidade. Itens de baixa confiança não entram como confirmados; permanecem utilizáveis como preliminares.

## 8. Importação, arquivos e deduplicação

### 8.1 Pipeline

`arquivo → identificação → parser/adapter → registros brutos → normalização → deduplicação → interpretação → regras → conciliação sugerida → revisão → agregação`

Importações podem ocorrer em qualquer ordem e em momentos diferentes. Reprocessar deve ser idempotente.

### 8.2 Formatos/adapters iniciais

Prioridade de implementação baseada nas fontes validadas na Discovery:

1. Nubank extrato CSV, formato preferencial quando disponível;
2. Nubank extrato PDF, fallback/validação;
3. Nubank cartão PDF;
4. Caixa cartão PDF, inclusive múltiplos cartões na mesma fatura;
5. Inter cartão PDF, inclusive antecipações e fatura nominal zerada;
6. Rico/XP cartão CSV;
7. novos adapters adicionados explicitamente, sem parser genérico que finja reconhecer formatos desconhecidos.

Todo adapter produz o mesmo contrato normalizado e registra nome e versão. Falha parcial deve preservar arquivo e diagnóstico, sem criar transações incompletas silenciosamente.

### 8.3 Arquivos

- bucket privado por usuário;
- caminho não previsível e isolado;
- metadados: nome original, MIME, tamanho, hash SHA-256, instituição/produto/formato detectados, período, parser e versão, status, contagens e erros;
- opção de manter ou remover o binário após processamento; metadados, hash e registros brutos permanecem conforme política de retenção;
- URLs sempre assinadas e temporárias;
- nunca registrar conteúdo financeiro integral em logs de aplicação.

### 8.4 Deduplicação

Camadas obrigatórias:

1. hash de arquivo por usuário;
2. identificador externo da transação quando fornecido;
3. fingerprint determinístico por fonte com campos como conta/cartão, data, valor, moeda, descrição normalizada, parcela e competência;
4. detecção de possíveis duplicidades quando a chave não for conclusiva.

Duplicidade certa bloqueia nova inserção idêntica; possível duplicidade cria pendência. Não mesclar transações apenas por mesmo valor/data. Conciliação não é deduplicação: pagamento e fatura são registros diferentes ligados entre si.

## 9. Fluxo mensal e fechamento

### 9.1 Etapas

1. Importar arquivos de qualquer fonte e em qualquer ordem.
2. Processar e aplicar regras determinísticas.
3. Revisar somente exceções.
4. Conferir totais, fontes, conciliações e pendências.
5. Fechar ou fechar com pendências.

### 9.2 Estados do mês

- `in_progress` — Em andamento. Dashboard disponível, números preliminares.
- `closed_with_pending` — Fechado com pendências. Entra no histórico com alerta e snapshot/versionamento.
- `closed` — Fechado. Pendências obrigatórias resolvidas e indicadores consolidados.

Fechar com pendências exige confirmação com quantidade e valor afetado. Reabrir muda o estado para `in_progress`, preserva histórico de fechamento e permite recalcular. Fechar novamente cria nova versão/snapshot ou atualiza com trilha de auditoria.

### 9.3 Conferências mínimas

- fontes esperadas e importadas, sem obrigar todas para uso parcial;
- nenhuma duplicidade certa;
- pagamentos de fatura e estornos conciliados quando possível;
- todas as transações com natureza confirmada para estado `closed`;
- titularidade e categoria resolvidas para gastos do estado `closed`;
- valor e quantidade de pendências visíveis;
- agregados reconciliáveis com transações subjacentes.

## 10. Especificação das telas

### 10.1 Navegação global

Sidebar desktop fixa/recolhível: Visão Geral, Movimentações, Revisão, Terceiros, Histórico, Compromissos, Importações e Regras. Configurações no rodapé. Seletor de mês consistente. Mobile usa navegação compacta; dashboards e revisão são de primeira classe, tabelas viram cards/drawers.

### 10.2 Visão Geral

- mês e setas anterior/próximo;
- estado do mês;
- barra de qualidade: percentual categorizado, titularidade confirmada, número/valor de pendências;
- cards: Receitas, Gastos pessoais, Resultado, Renda consumida;
- em cada card, R$, comparação absoluta e percentual com mês anterior quando houver base;
- rótulo `Preliminar` nos valores afetados por mês incompleto;
- “Para onde foi meu dinheiro?” em barras horizontais, R$ + %, categorias expansíveis em subcategorias;
- `A revisar` separado;
- card Terceiros: a receber, crédito/a pagar, reembolsado no mês;
- card Compromissos: próximos três meses, pessoal e terceiros;
- no máximo três insights descritivos por mês;
- clique em qualquer agregado abre as transações componentes.

### 10.3 Movimentações

Tabela desktop: Data, Descrição, Conta/Cartão, Categoria, Titularidade, Natureza e Valor. Busca livre. Filtros por período, instituição, conta/cartão, categoria, subcategoria, natureza, pessoa, titularidade e revisão. Tabs: Todas, Gastos, Receitas, Terceiros, Transferências e Investimentos.

Drawer mostra interpretação editável, parcela/compra original, competência, origem do arquivo, descrição bruta, parser, regra/fonte da classificação e vínculos de conciliação. Dado original é somente leitura.

### 10.4 Revisão

Inbox com total e grupos Categoria, Titularidade, Natureza, Competência, Conciliação e Possível duplicidade. Cada card pergunta somente o que falta. Ações para titularidade: 100% minha, outra pessoa, dividir; rateio aceita R$ ou %, várias pessoas e valida soma. Após decidir: somente esta, semelhantes deste mês ou criar regra. Possui pular. Próximo item entra automaticamente.

### 10.5 Terceiros

Resumo de a receber e crédito/a pagar. Lista por pessoa com saldo e itens abertos. Detalhe é um razão cronológico com evento, descrição, débito/crédito e saldo acumulado, além de parcelas futuras dessa pessoa. Conciliação de PIX é sugerida e requer confirmação; suporta liquidação parcial, múltiplos itens e excedente.

### 10.6 Histórico

Filtros 3M, 6M, 12M, Ano e Tudo. Gráfico Receitas × Gastos pessoais; resultado no detalhe. Tabela mensal com Receitas, Gastos, Resultado e Renda consumida, R$ e variações. Evolução de uma categoria/subcategoria selecionada, evitando muitos gráficos simultâneos. `closed_with_pending` recebe alerta de qualidade.

### 10.7 Compromissos

Somente obrigações conhecidas. Exibe total futuro, pessoal e terceiros; gráfico mensal consolidado entre cartões; detalhe por compra, parcela, cartão, parte pessoal, parte de terceiros e total. Última parcela encerra o compromisso. Não exibir previsão de renda nem percentual da renda futura.

### 10.8 Importações

Central por mês com cards das fontes cadastradas, arquivo, data, contagem e status. Upload por seleção ou arrastar. Detectar instituição, produto, período e formato; pedir seleção manual se incerto. Mostrar preview antes de confirmar. Arquivo já importado deve ser bloqueado sem duplicar. Mostrar erros por linha/registro e permitir reprocessar com nova versão do parser.

### 10.9 Regras

Tabela: Regra, Tipo, Resultado, Uso, Prioridade e Status. Filtros por tipo e status. Detalhe mostra condições, ações, origem, criação, última aplicação e contagem. Permite criar, testar contra exemplos, editar, reordenar prioridade, desativar e excluir com confirmação. Alterar regra não reescreve histórico silenciosamente; oferecer simulação e reprocessamento explícito.

### 10.10 Configurações

- Financeiro: instituições, contas, cartões, finais, portadores e contas próprias.
- Categorias: categorias/subcategorias editáveis, com bloqueios mínimos para integridade.
- Pessoas: nome, aliases e relacionamento opcional.
- Dados: exportação, arquivos importados, retenção do original e exclusão de dados.
- Perfil: dados básicos e preferências de moeda/fuso; V1 assume BRL e `America/Sao_Paulo` como defaults configuráveis, nunca como lógica fixa global.

## 11. Direção visual e acessibilidade

- desktop-first responsivo;
- estilo minimalista, analítico, calmo e confiável;
- fundo branco/cinza muito claro, cards brancos, bordas discretas, texto quase preto e cinzas neutros;
- verde-floresta como cor principal, sobre neutros quentes claros;
- verde, ocre e vermelho têm papéis semânticos explícitos; nem todo gasto é vermelho;
- Nunito Sans para interface e Literata somente em títulos editoriais; números tabulares quando disponível;
- bastante espaço em branco e poucos gráficos;
- hierarquia: número primeiro, rótulo e comparação depois;
- não depender apenas de cor; contraste WCAG AA, foco visível, teclado e rótulos acessíveis;
- formatação pt-BR para exibição, armazenamento numérico e datas independentes de locale.

## 12. Arquitetura técnica

### 12.1 Stack

- Next.js com TypeScript;
- Supabase PostgreSQL;
- Supabase Auth;
- Supabase Storage privado;
- frontend hospedável em tier gratuito compatível;
- processamento de CSV/PDF no servidor ou job compatível com free tier;
- IA opcional, nunca necessária para importação, regras, revisão ou cálculos essenciais.

### 12.2 Limites arquiteturais

- lógica financeira pura em domínio testável, separada de UI e acesso ao banco;
- adapters isolados por fonte/formato e versionados;
- valores monetários em `numeric`/decimal, nunca `float`;
- datas de negócio como `date`; eventos/auditoria como `timestamptz`;
- UUIDs como PKs;
- cálculos agregados preferencialmente derivados de transações e alocações; snapshots de fechamento guardam versão e facilitam auditoria;
- operações de importação e reprocessamento idempotentes;
- sem dependência essencial de serviço pago.

## 13. Modelo relacional conceitual

Todos os registros pertencentes ao usuário contêm `user_id uuid not null` referenciando `auth.users(id)`, salvo tabelas globais explicitamente somente leitura. Campos comuns: `id uuid PK`, `created_at timestamptz`, `updated_at timestamptz`.

### 13.1 Identidade e cadastro financeiro

**profiles** — `user_id PK/FK`, `display_name text`, `currency char(3)`, `timezone text`.

**institutions** — global ou por usuário: `code text`, `name text`, `country text`, `is_active boolean`. Se global, usuário só lê.

**accounts** — `institution_id FK`, `name text`, `type account_type`, `currency`, `external_ref text nullable`, `is_own boolean`, `is_active boolean`.

**cards** — `institution_id FK`, `billing_account_id FK nullable`, `name text`, `last_four text nullable`, `holder_name text nullable`, `closing_day smallint nullable`, `due_day smallint nullable`, `is_active boolean`. Uma fatura pode conter vários cartões.

Enums: `account_type = checking|savings|payment|cash|investment|other`.

### 13.2 Importação e camada bruta

**imports** — `account_id/card_id nullable`, `original_filename text`, `storage_path text nullable`, `mime_type text`, `size_bytes bigint`, `sha256 text`, `detected_institution_id`, `source_kind source_kind`, `format file_format`, `period_start/end date nullable`, `parser_name text`, `parser_version text`, `status import_status`, `row_count`, `success_count`, `error_count`, `error_summary jsonb`.

**raw_records** — `import_id FK`, `source_row_number int nullable`, `external_id text nullable`, `raw_payload jsonb`, `raw_text text nullable`, `record_hash text`, `parse_status`, `parse_errors jsonb`. Imutável após criação, exceto status técnico aditivo.

Enums: `source_kind = bank_statement|card_statement|other`; `file_format = csv|pdf`; `import_status = uploaded|identified|processing|processed|partial|failed|duplicate`.

### 13.3 Normalização e interpretação

**merchants** — por usuário: `canonical_name text`, `default_category_id nullable`, `default_subcategory_id nullable`.

**merchant_aliases** — `merchant_id FK`, `pattern text`, `match_type`, `institution_id nullable`, `confidence numeric`, `confirmed_by_user boolean`.

**transactions** — `raw_record_id FK nullable`, `import_id FK`, `account_id/card_id nullable`, `external_id text nullable`, `occurred_on date nullable`, `posted_on date nullable`, `competence_month date` (primeiro dia do mês), `description_raw text`, `description_normalized text`, `merchant_id FK nullable`, `amount numeric(18,2)` em magnitude positiva, `direction transaction_direction`, `currency char(3)`, `nature economic_nature`, `category_id/subcategory_id nullable`, `review_status review_status`, `category_source decision_source`, `nature_source decision_source`, `ownership_source decision_source`, `category_confidence/nature_confidence/ownership_confidence numeric nullable`, `manual_locks jsonb`, `dedupe_key text`, `is_void boolean default false`.

**transaction_links** — `from_transaction_id`, `to_transaction_id`, `link_type`, `amount numeric`, `status`, `confirmed_by_user boolean`; usado para estorno, pagamento-fatura, transferência própria, reembolso, duplicidade e relações correlatas.

Enums principais:

- `transaction_direction = inflow|outflow|neutral`;
- `economic_nature = income|expense|own_transfer|card_payment|investment|redemption|refund|third_party|loan_given|loan_received|loan_repayment|reversal|investment_income|adjustment|unclassified`;
- `review_status = pending|suggested|confirmed|not_required`;
- `decision_source = manual|user_rule|merchant_mapping|global_rule|parser|heuristic|ai_suggestion|unknown`;
- `link_type = reversal_of|pays_statement|own_transfer_pair|settles_third_party|duplicate_of|related`.

### 13.4 Categorias, pessoas e rateios

**categories** — `name text`, `kind category_kind`, `color text nullable`, `sort_order int`, `is_active boolean`, `is_system_seed boolean`.

**subcategories** — `category_id FK`, `name text`, `sort_order int`, `is_active boolean`.

**people** — `full_name text`, `relationship text nullable`, `notes text nullable`, `is_active boolean`.

**person_aliases** — `person_id FK`, `alias text`, `institution_id nullable`, `match_type`.

**allocations** — `transaction_id FK`, `owner_type owner_type`, `person_id FK nullable`, `amount numeric(18,2)`, `percentage numeric(9,6) nullable`, `status allocation_status`, `source decision_source`. Constraint: `person_id` obrigatório para `third_party`; soma por transação igual ao valor relevante.

**third_party_entries** — razão imutável/ajustável: `person_id FK`, `transaction_id FK nullable`, `entry_type`, `amount_signed numeric(18,2)`, `occurred_on date`, `competence_month date`, `status`, `notes`. Saldo é soma assinada, com convenção documentada.

**settlements** — `person_id FK`, `payment_transaction_id FK nullable`, `amount numeric`, `status`, `confirmed_at`, `notes`.

**settlement_allocations** — `settlement_id FK`, `third_party_entry_id FK`, `amount numeric`.

### 13.5 Parcelas e compromissos

**installment_groups** — `merchant_id nullable`, `description text`, `purchase_date date nullable`, `original_amount numeric nullable`, `total_installments int`, `currency`, `source_confidence`, `status`.

**installments** — `installment_group_id FK`, `transaction_id FK nullable`, `installment_number int`, `competence_month date`, `amount numeric`, `status installment_status`, unique por grupo+número. Parcelas futuras podem existir sem transação importada e viram realizadas quando conciliadas.

Alocações futuras pessoais/terceiros podem ser materializadas em **installment_allocations** ou derivadas de uma regra de rateio do grupo. Devem preservar centavos e total.

### 13.6 Regras e revisão

**rules** — `name text`, `rule_type rule_type`, `conditions jsonb`, `actions jsonb`, `priority int`, `scope`, `is_active boolean`, `origin rule_origin`, `times_applied int`, `last_applied_at`, `version int`.

**rule_applications** — `rule_id FK`, `transaction_id FK`, `rule_version int`, `before_state jsonb`, `after_state jsonb`, `applied_at`.

**review_items** — `transaction_id FK nullable`, `import_id FK nullable`, `review_type`, `status`, `reason text`, `suggested_value jsonb`, `resolved_value jsonb`, `resolved_at`.

### 13.7 Fechamento e auditoria

**monthly_closings** — `competence_month date`, `status closing_status`, `version int`, `metrics_snapshot jsonb`, `pending_count int`, `pending_amount numeric`, `closed_at`, `reopened_at nullable`, unique por usuário+mês+versão.

**audit_events** — `entity_type`, `entity_id`, `action`, `before_data jsonb`, `after_data jsonb`, `actor_user_id`, `created_at`. Não incluir segredos ou arquivo bruto integral.

### 13.8 Índices e constraints sugeridos

- unique `(user_id, sha256)` em imports ativos;
- unique parcial `(user_id, source_kind, external_id)` quando external_id não nulo e escopo da fonte conhecido;
- unique `(user_id, dedupe_key)` conforme adapter/conta;
- índices `(user_id, competence_month)`, `(user_id, occurred_on)`, `(user_id, nature, competence_month)`, `(user_id, category_id, competence_month)`;
- índices por `account_id`, `card_id`, `merchant_id`, `review_status`;
- unique `(user_id, person_id, alias)` e `(user_id, category_id, name)` onde aplicável;
- GIN em `rules.conditions` apenas se consultas justificarem; começar simples;
- checks para `amount >= 0`, parcelas válidas e percentuais entre 0 e 100;
- FKs com exclusão restrita ou soft delete para entidades já referenciadas.

## 14. Segurança e privacidade

- autenticação obrigatória;
- RLS habilitada em todas as tabelas com dados do usuário;
- política padrão: usuário só seleciona/insere/atualiza/exclui linhas onde `user_id = auth.uid()`;
- tabelas filhas devem ter `user_id` próprio ou políticas com `exists` seguro no pai; não confiar apenas no frontend;
- Storage privado com políticas por prefixo/owner;
- service role somente no servidor, nunca no bundle ou browser;
- validação server-side de arquivo, tamanho, MIME e parser;
- proteção contra path traversal, CSV injection em exportação e conteúdo malicioso em PDF;
- dados financeiros minimizados em logs e ferramentas de observabilidade;
- segredos em variáveis de ambiente;
- exclusão de conta/dados com confirmação, escopo claro e comportamento documentado;
- exportação disponível para evitar lock-in.

## 15. Exportação e backup

Configurações → Dados deve exportar um ZIP com CSV/JSON documentados: contas/cartões, transações interpretadas, registros brutos estruturados quando seguro, categorias, merchants, pessoas, rateios, razão de terceiros, parcelas, regras, importações/metadados e fechamentos. Arquivos binários originais podem ser opção separada por volume. Valores e datas usam formato não ambíguo e IDs estáveis. A V1 não promete backup automático; README deve ensinar backup do banco e Storage para quem administra a instância.

## 16. Casos de homologação derivados de agosto/2026

Criar fixtures sintéticas/anônimas que cubram, sem copiar dados pessoais:

1. mesmo cartão com compra à vista, parcelada e estorno correspondente;
2. parcela antiga cuja fatura atual repete a data original;
3. pagamento de fatura no extrato exatamente igual ao total conciliável;
4. fatura zerada por antecipação, mas com despesas econômicas no ciclo;
5. uma fatura contendo múltiplos cartões;
6. aplicação e resgate sem impacto em receita/gasto;
7. entrada de conta própria tratável como transferência ou receita centralizada;
8. mesma pessoa enviando receita em uma ocasião e reembolso em outra;
9. empréstimo concedido, devolução parcial e saldo remanescente;
10. rateio 50/50 com arredondamento de centavo;
11. PIX maior e menor que o saldo sugerido para reembolso;
12. merchant conhecido e descrição ambígua;
13. importação repetida do mesmo arquivo e possível duplicidade entre formatos;
14. mês fechado com pendências, reaberto e fechado novamente;
15. compromisso pessoal e de terceiro nas parcelas futuras.

## 17. Critérios de aceite da V1

- O usuário importa cada formato inicial e vê preview, diagnóstico e registros normalizados.
- Reimportar o mesmo arquivo não duplica transações.
- Dado bruto permanece acessível e inalterado após edições e reprocessamento.
- Uma compra e seu pagamento de fatura contam uma vez nos gastos.
- Aplicação/resgate não alteram receitas ou gastos.
- Estorno vinculado reduz corretamente o gasto.
- Receita, gasto pessoal, resultado e renda consumida batem com fixtures aprovadas.
- Categorias e subcategorias exibem R$ e % com denominadores documentados.
- Categoria e titularidade podem ser revisadas independentemente.
- Rateios por R$ e % suportam múltiplas pessoas e preservam centavos.
- Terceiros têm razão, saldo, liquidação parcial e crédito excedente corretos.
- Regras respeitam precedência; edição manual não é sobrescrita.
- Dashboard funciona em mês aberto e marca valores preliminares.
- Os três estados do mês funcionam e o fechamento pode ser revertido.
- Histórico sinaliza meses com pendências.
- Compromissos mostram somente parcelas conhecidas e separam pessoal/terceiros.
- Todo agregado permite drill-down às transações.
- Usuário A não acessa dados nem arquivos do usuário B em testes de RLS.
- Exportação contém dados suficientes para reconstrução e auditoria.
- Fluxos essenciais funcionam no free tier sem API paga.
- Layout crítico funciona em desktop e celular, com acessibilidade básica validada.

## 18. Estratégia de testes

- testes unitários do domínio: competência, métricas, percentuais, estornos, rateios, saldos, parcelas e precedência;
- contract/golden tests para cada parser com fixtures anonimizadas;
- testes de idempotência e deduplicação;
- testes de integração com banco para constraints, migrations, RLS e agregações;
- testes de propriedade para soma de rateios, centavos e conservação de valores;
- testes end-to-end: autenticar, importar, revisar, fechar, reabrir, exportar;
- testes de regressão com os 15 casos de homologação;
- testes de segurança: isolamento entre usuários, Storage privado e ausência de service key no cliente;
- testes de responsividade e acessibilidade nas telas principais.

## 19. Roadmap recomendado

### Fase 0 — Fundação

Projeto, qualidade, Supabase local/remoto, Auth, schema inicial, migrations, RLS, seeds genéricos e CI.

### Fase 1 — Domínio financeiro

Modelo bruto/interpretado, categorias, pessoas, transações, alocações, métricas puras e fixtures sintéticas.

### Fase 2 — Importação mínima vertical

Upload privado, hash, pipeline idempotente e Nubank extrato CSV. Importações e Movimentações já utilizáveis.

### Fase 3 — Cartões e adapters

Nubank PDF, Caixa PDF, Inter PDF e Rico/XP CSV; faturas, múltiplos cartões, parcelas, pagamentos e estornos.

### Fase 4 — Regras e revisão

Merchants, aliases, motor de precedência, confiança, inbox e auditoria.

### Fase 5 — Terceiros

Pessoas, rateios, razão, sugestões de reembolso, liquidação parcial e créditos.

### Fase 6 — Fechamento e Visão Geral

Agregações, qualidade, estados, snapshots, drill-down e insights descritivos.

### Fase 7 — Histórico e Compromissos

Comparações, evolução de categorias e parcelas futuras pessoais/terceiros.

### Fase 8 — Configurações, exportação e endurecimento

Gerenciamento, ZIP, exclusão/retention, acessibilidade, segurança, performance e documentação.

Cada fase precisa terminar com migration, testes, documentação e demonstração vertical; não deixar toda a UI ou integração para o final.

## 20. Riscos e decisões futuras

- PDFs mudam layout; adapters precisam de versão, fixtures e falha explícita.
- PDFs protegidos podem não ser parseáveis; CSV continua alternativa preferida.
- Data de competência de parcela pode exigir inferência específica por fonte.
- Conciliações ambíguas não podem ser automáticas.
- Free tiers e limites de hospedagem podem mudar; revisar antes do deploy sem alterar o princípio free-tier-first.
- Armazenar arquivos originais aumenta rastreabilidade e consumo de Storage; manter configurável.
- Reprocessamento histórico após mudança de regra exige preview e política de manual locks.
- Futuro: Open Finance, recorrências, projeções, patrimônio, orçamento, backup em Drive, IA e compartilhamento. Nenhum deles deve contaminar a V1 sem nova decisão de produto.

## 21. Decisões que não podem ser reinterpretadas durante a implementação

1. Valores absolutos e percentuais convivem.
2. Categoria, natureza e titularidade são independentes.
3. Terceiros não são categoria.
4. Pagamento de cartão não é gasto novo.
5. Aplicação/resgate não é consumo/renda.
6. Parcelas são reconhecidas por competência mensal; valor total não é gasto no mês da compra.
7. Compromisso pessoal e de terceiro são separados.
8. Manual vence automação.
9. Regras são editáveis e desativáveis.
10. Dado bruto é imutável e separado da interpretação.
11. Dashboard funciona antes do fechamento.
12. Fechamento é reversível e pode existir com pendências.
13. Dados reais da Discovery são testes, nunca hardcode.
14. V1 essencial funciona sem serviço pago.
