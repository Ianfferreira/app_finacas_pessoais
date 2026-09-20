# CODEX — Instruções operacionais do projeto Finanças Pessoais

## 1. Mandato

Você está construindo a aplicação especificada em `MASTER_SPEC.md`. Antes de alterar código, schema, UX ou documentação:

1. leia `MASTER_SPEC.md` integralmente;
2. leia este arquivo integralmente;
3. consulte o chat de Discovery associado, “Planejamento financeiro Discovery” (`6aaffa8f-4b10-83e9-a305-cced487cb32f`), quando precisar entender a intenção, exemplos ou decisões que originaram a especificação;
4. inspecione o estado real do repositório, migrations, testes e documentação;
5. preserve alterações do usuário que não pertençam à tarefa.

`MASTER_SPEC.md` é a fonte de verdade funcional. O chat é contexto complementar. Este arquivo define como trabalhar. Código existente não revoga silenciosamente uma regra de negócio documentada.

## 2. Regras inegociáveis

- Não invente, simplifique, una ou altere regras financeiras para facilitar a implementação.
- Não transforme hipóteses de engenharia em decisões de produto.
- Quando houver ambiguidade funcional não resolvida pela especificação ou pela Discovery, documente a dúvida, apresente o impacto e peça decisão antes de implementar comportamento irreversível ou visível ao usuário.
- Para lacunas puramente técnicas, tome decisão razoável, pequena, reversível e documentada.
- Nunca hardcode nomes, valores, contas, cartões, merchants, pessoas ou relacionamentos dos arquivos reais do Ian.
- Use somente fixtures sintéticas/anônimas em seeds e testes versionados.
- Preserve separação imutável entre dado bruto e interpretação.
- Não sobrescreva uma decisão manual com parser, heurística, regra global ou sugestão.
- Não conte pagamento de fatura como gasto novo.
- Não conte aplicação como gasto nem resgate como receita.
- Não use “Terceiros” como categoria.
- Não acople categoria, natureza e titularidade.
- Não trate conta de mesma titularidade como transferência automática sem contexto/conciliação.
- Não feche mês de forma irreversível.
- Não faça IA ou serviço pago ser requisito de uma função essencial.
- Mantenha a V1 operável em free tiers.

## 3. Grau de autonomia

Você pode decidir autonomamente:

- organização de módulos e nomes técnicos consistentes;
- biblioteca de validação, testes e componentes, desde que compatível com a stack;
- índices adicionais fundamentados por consultas;
- tratamento de erros, observabilidade segura e acessibilidade;
- detalhes de UI que não mudem fluxo, significado ou escopo;
- refactors pequenos que reduzam duplicação e mantenham comportamento.

Você deve sinalizar antes de decidir:

- mudança de fórmula, denominador ou competência;
- mudança de precedência de regras;
- classificação automática que possa alterar receita/gasto/titularidade;
- remoção ou fusão de entidades relevantes;
- inclusão de serviço pago, dependência externa crítica ou saída do free tier;
- redução de RLS/privacidade;
- reprocessamento histórico destrutivo;
- mudança de escopo V1 ou inclusão de funcionalidade fora de escopo;
- qualquer divergência entre implementação atual e `MASTER_SPEC.md` que exija migração de dados.

## 4. Forma de trabalhar

### 4.1 Incrementos verticais

Construa em fatias pequenas e utilizáveis. Cada incremento deve incluir, conforme aplicável:

- migration/schema;
- tipos e validação;
- regra de domínio;
- acesso a dados com RLS;
- UI mínima funcional;
- estados vazio, carregando, erro e sucesso;
- testes;
- documentação.

Evite criar dezenas de abstrações antes de um fluxo vertical funcionar. Evite também colocar lógica financeira diretamente em componentes React, route handlers ou SQL ad hoc espalhado.

### 4.2 Antes de implementar uma tarefa

1. Localize as seções correspondentes de `MASTER_SPEC.md`.
2. Liste regras e critérios de aceite afetados.
3. Inspecione migrations e testes existentes.
4. Verifique se há dados/alterações locais não relacionados.
5. Escolha o menor incremento que entrega comportamento verificável.

### 4.3 Durante a implementação

- Use TypeScript estrito; não masque incerteza com `any`.
- Valores monetários usam decimal/numeric e utilitário explícito; nunca `float`.
- Funções de domínio devem ser puras sempre que possível.
- Parsing é adapter específico e versionado.
- Importação e reprocessamento são idempotentes.
- Preserve o payload bruto e grave proveniência de toda interpretação.
- Alterações manuais criam lock/proveniência e trilha de auditoria.
- Faça migrations forward-only e revisáveis. Nunca edite migration já aplicada para “corrigir” histórico; crie nova migration.
- Não use o schema gerado manualmente como fonte de verdade; regenere tipos após migrations quando o projeto oferecer esse fluxo.
- Mantenha acessibilidade e responsividade no mesmo incremento, não como reforma futura.

### 4.4 Antes de encerrar a tarefa

Execute os comandos disponíveis e relevantes do repositório:

- formatação;
- lint;
- typecheck;
- testes unitários;
- testes de integração/RLS quando afetados;
- testes end-to-end do fluxo alterado quando existentes;
- build de produção quando proporcional ao risco.

Se um comando não existir, não invente sucesso: registre a lacuna e, se estiver no escopo, adicione o script. Se não puder executar algo por ambiente, informe exatamente o que ficou sem validar.

## 5. Arquitetura esperada

Stack: Next.js + TypeScript + Supabase PostgreSQL/Auth/Storage.

Separe conceitualmente:

- `domain`: dinheiro, competência, métricas, parcelas, rateios, regras e conciliação;
- `application`: casos de uso como importar, revisar, fechar, reabrir e exportar;
- `infrastructure`: Supabase, Storage, parsers, jobs e integrações;
- `ui`: páginas e componentes;
- `test fixtures`: dados sintéticos e arquivos anonimizados.

Não é obrigatório usar esses nomes de diretório, mas as dependências devem apontar para o domínio, não o contrário. O domínio não deve depender de React ou do SDK do Supabase.

## 6. Banco, migrations e RLS

- Toda mudança estrutural passa por migration versionada.
- Toda tabela de usuário contém `user_id` ou possui política segura por associação ao pai.
- Habilite RLS antes de considerar a tabela pronta.
- Escreva políticas explícitas para `select`, `insert`, `update` e `delete`; não dependa apenas de filtro no código.
- Teste dois usuários: A não lê nem altera linhas, relações ou arquivos de B.
- Use UUID, `numeric` para dinheiro, `date` para data de negócio e `timestamptz` para eventos.
- Constraints protegem invariantes: quantias não negativas quando em magnitude, parcelas válidas, soma de rateios, unicidade de hash/chaves e FKs.
- Prefira soft delete/inativação para categorias, pessoas, regras, contas e cartões já referenciados.
- Service role só no servidor e apenas quando RLS não for suficiente para uma operação administrativa controlada.
- Storage deve ser privado, isolado por usuário e acessado por URL assinada temporária.

Uma fase com tabela sem RLS e sem teste de isolamento não está concluída.

## 7. Dados brutos e processamento

O dado bruto é evidência. A interpretação é mutável.

- Arquivo e `raw_record` nunca são reescritos para refletir categoria, merchant ou titularidade.
- Campos derivados ficam em tabelas/campos interpretados com fonte, confiança e versão.
- Novo parser não deve apagar o resultado anterior sem caminho de auditoria.
- Falha de parser é explícita. Não “complete” dados ausentes com invenção.
- Adapters convergem para contrato normalizado comum.
- CSV é preferido quando disponível; PDF é suportado por adapter específico.
- Registre parser e versão em cada importação.
- Logs não devem conter extratos integrais, nomes completos desnecessários ou payloads financeiros sensíveis.

## 8. Motor de regras

Implemente a precedência definida na especificação:

`manual > regra do usuário > merchant confirmado > regra global > parser > heurística > sugestão > pendente`

Requisitos:

- tipos separados de regra;
- condições e ações validadas;
- prioridade e especificidade determinísticas;
- editar, ativar/desativar e excluir;
- registrar cada aplicação e versão;
- explicar por que uma classificação foi aplicada;
- correção de uma transação não altera regra automaticamente;
- reprocessamento oferece preview e respeita manual locks;
- regras devem poder ser testadas contra amostras antes de ativação.

Evite um mini-language ou engine genérico sofisticado antes de os casos reais exigirem. JSON validado com operadores limitados e explícitos é suficiente para a V1.

## 9. Parsers e deduplicação

Ordem inicial:

1. Nubank extrato CSV;
2. Nubank extrato PDF;
3. Nubank cartão PDF;
4. Caixa cartão PDF;
5. Inter cartão PDF;
6. Rico/XP cartão CSV.

Cada adapter deve ter:

- identificação de formato;
- schema/contrato de saída;
- fixtures anonimizadas;
- golden tests;
- erros legíveis;
- versão;
- teste de idempotência;
- casos de datas, sinais, moeda, parcelas, cartões/portadores e linhas ignoradas.

Deduplicação ocorre por camadas: hash do arquivo, ID externo, fingerprint determinístico e revisão de possíveis duplicidades. Não confunda deduplicação com conciliação. Dois registros ligados — compra e estorno, compra e pagamento, saída e entrada de transferência — continuam sendo dois registros.

## 10. Testes obrigatórios

Não entregue regra financeira crítica sem teste. No mínimo:

- compra + pagamento de fatura = um gasto econômico;
- investimento/resgate = zero em receita/gasto;
- estorno reduz gasto sem virar receita;
- transferência própria não vira receita/gasto;
- receita centralizada é contada uma vez;
- parcela entra na competência correta, mesmo com data original antiga;
- gasto pessoal usa somente alocação do titular;
- rateio por valor e percentual fecha em centavos;
- terceiro com reembolso parcial mantém saldo;
- reembolso excedente não vira receita automaticamente;
- manual vence automação;
- regra desativada não aplica;
- reprocessamento preserva manual locks;
- mesmo arquivo/transação não duplica;
- fechar com pendências, reabrir e fechar novamente mantém auditoria;
- usuário A não acessa usuário B.

Use os cenários de agosto/2026 somente como inspiração para fixtures sintéticas. Nunca versionar documentos reais nem nomes/valores pessoais sem autorização explícita.

## 11. UX e qualidade

- O dashboard deve funcionar com mês em andamento.
- Todo número preliminar afetado por pendências deve ser identificado.
- Todo agregado oferece drill-down.
- Revisão pergunta apenas o que está faltando.
- Erros de parser/importação são acionáveis.
- Estado vazio ensina o próximo passo.
- Mobile preserva dashboard e revisão; tabelas podem virar cards/drawers.
- R$ e % aparecem juntos quando houver denominador válido.
- Não usar cor como único indicador.
- Não transformar todo gasto em vermelho.
- Insights são descritivos e no máximo três por mês.

## 12. Documentação viva

Mantenha:

- `README.md`: configuração local, Supabase, variáveis, migrations, testes, execução e deploy;
- `MASTER_SPEC.md`: só altere mediante decisão funcional explícita do Ian;
- `CODEX.md`: processo de trabalho;
- `CHANGELOG.md` ou equivalente: mudanças relevantes por fase/release;
- `docs/decisions/` ou equivalente: ADRs curtos para decisões técnicas com impacto duradouro;
- catálogo de parsers e formatos suportados;
- dicionário de dados e instruções de exportação/backup quando implementados.

Não registre uma escolha trivial em ADR. Registre escolhas que condicionam migrations, segurança, consistência financeira, deploy ou dependências.

## 13. Ordem recomendada de implementação

### Etapa 0 — Auditoria do repositório

Confirmar stack, scripts, estado do Git, env example, documentação e lacunas. Não substituir uma base existente sem necessidade.

### Etapa 1 — Fundação segura

Next.js/TypeScript, lint/typecheck/tests, Supabase, Auth, perfil, migrations, geração de tipos, RLS e CI. Entrega: usuário autentica e só lê o próprio perfil.

### Etapa 2 — Núcleo do domínio

Categorias, contas/cartões, pessoas, imports/raw records, transactions, allocations e funções de métricas. Entrega: fixtures sintéticas produzem métricas esperadas sem UI sofisticada.

### Etapa 3 — Primeiro fluxo vertical de importação

Storage privado, upload, SHA-256, Nubank extrato CSV, preview, confirmação, idempotência e tela de Movimentações. Entrega: um arquivo sintético entra, é auditável e não duplica.

### Etapa 4 — Naturezas e conciliação básica

Transferência, pagamento de fatura, investimento/resgate e estorno. Entrega: regras críticas de não dupla contagem testadas.

### Etapa 5 — Cartões e parcelas

Nubank PDF, Caixa PDF, Inter PDF, Rico/XP CSV, múltiplos cartões, faturas, competência e installment groups. Entrega: compromissos conhecidos calculáveis.

### Etapa 6 — Merchants, regras e revisão

Normalização, precedência, confiança, provenance, review items e UI de revisão. Entrega: correção manual e criação de regra funcionam sem sobrescrever o bruto.

### Etapa 7 — Terceiros

Rateios, razão, saldos, PIX sugerido, settlement parcial e crédito. Entrega: gasto pessoal e saldo por pessoa fecham em centavos.

### Etapa 8 — Fechamento e dashboard

Qualidade, estados, snapshots, Visão Geral, drill-down e até três insights. Entrega: mês pode fechar, fechar com pendências e reabrir.

### Etapa 9 — Histórico e compromissos

Comparações R$ + %, filtros, alertas de qualidade e compromissos pessoais/terceiros. Entrega: evolução e parcelas futuras consolidadas.

### Etapa 10 — Configurações, exportação e hardening

Gestão de cadastros, ZIP de exportação, retenção/exclusão, acessibilidade, performance, segurança, documentação de backup e deploy free-tier-first.

Não pule direto para dashboards com dados mockados se o domínio e as invariantes ainda não estiverem testados. Mocks de UI podem existir, mas não contam como conclusão de fase.

## 14. Checkpoints

Ao final de cada etapa, apresente a Ian:

1. o que funciona de ponta a ponta;
2. migrations adicionadas e impacto em dados;
3. regras da spec cobertas;
4. testes executados e resultado;
5. limitações ou riscos restantes;
6. arquivos/documentação atualizados;
7. demonstração ou instruções curtas de validação;
8. próximo incremento recomendado.

Não esconda dívida técnica relevante em uma frase genérica. Não marque etapa concluída se o caminho principal depende de seed pessoal, bypass de RLS, ajuste manual no banco ou dado mockado.

## 15. Definição de concluído por fase

Uma fase está concluída somente quando:

- o comportamento definido está implementado de ponta a ponta;
- migrations aplicam em banco limpo e atualização suportada;
- RLS e isolamento foram testados;
- testes críticos e regressão passam;
- lint, typecheck e build relevante passam;
- estados de erro/vazio/carregamento existem;
- não há dados pessoais hardcoded;
- documentação e changelog/decisão relevante estão atualizados;
- limitações conhecidas estão explícitas;
- a funcionalidade essencial não exige serviço pago;
- critérios de aceite correspondentes do `MASTER_SPEC.md` foram verificados.

“Código compilou”, “tela renderizou” ou “happy path manual funcionou” isoladamente não significam fase concluída.

## 16. Controle de escopo e overengineering

Não implementar na V1: orçamento, metas, patrimônio, rentabilidade, Open Finance, sincronização bancária, previsão probabilística, score, recomendações normativas, notificações complexas, dark mode, app nativo, compartilhamento, billing ou SaaS.

Não criar antecipadamente:

- microserviços;
- fila distribuída paga;
- event sourcing completo;
- rule engine genérico;
- data warehouse;
- design system separado como pacote;
- abstração multi-cloud;
- IA como classificador obrigatório.

Escolha a menor solução que mantenha segurança, auditabilidade e evolução. Se a alternativa simples violar a spec, ela não é aceitável; se uma arquitetura sofisticada não entrega valor de V1, ela não é necessária.

## 17. Como lidar com ambiguidades e desvios

Use este formato no checkpoint ou pedido de decisão:

- **Contexto:** qual fluxo/regra está afetado.
- **Evidência:** seção da spec, comportamento atual e teste relevante.
- **Ambiguidade/conflito:** o que não está definido ou diverge.
- **Opções:** no máximo três, com impacto em dados, UX e complexidade.
- **Recomendação:** escolha técnica ou funcional sugerida e por quê.
- **Ação aguardada:** decisão específica de Ian.

Enquanto aguarda, continue em trabalho independente seguro; não implemente silenciosamente a escolha controversa.

## 18. Prompt inicial curto para Ian

> Leia integralmente `MASTER_SPEC.md` e `CODEX.md` e consulte o chat associado “Planejamento financeiro Discovery” quando precisar de contexto. Primeiro audite o estado atual do repositório e compare-o com a ordem de implementação definida no `CODEX.md`. Em seguida, proponha e execute o menor próximo incremento vertical ainda incompleto, incluindo migration, RLS, testes e documentação. Não invente nem simplifique regras financeiras; sinalize ambiguidades de produto antes de implementá-las. Ao final, rode lint, typecheck e testes aplicáveis e apresente o checkpoint da fase.
