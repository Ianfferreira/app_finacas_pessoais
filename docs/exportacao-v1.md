# Exportação V1

## Formatos

O endpoint autenticado `GET /api/export` aceita:

- `?format=json`: um documento JSON versionado com todos os conjuntos de dados;
- `?format=csv`: a visão tabular de movimentações em `financas-movimentacoes.csv`;
- `?format=zip`: pacote para auditoria e restauração conceitual.

Todas as leituras usam o cliente autenticado do Supabase e, portanto, obedecem às políticas RLS do usuário da sessão. A exportação não usa service role.

## Conteúdo do JSON e do ZIP

O JSON contém `schemaVersion`, `exportedAt`, um `manifest` e os conjuntos de dados. O ZIP contém:

- `manifest.json`, com a versão, instante da exportação, nomes, caminhos e contagens;
- `dados/<entidade>.json` para perfis, instituições referenciadas, contas, cartões, importações, registros brutos, transações, vínculos, categorias, subcategorias, merchants, aliases, pessoas, alocações, razão de terceiros, settlements, faturas, parcelas, regras, revisão, fechamentos e auditoria;
- `financas-movimentacoes.csv`;
- `LEIA-ME.txt`.

Todos os conjuntos são consultados em páginas ordenadas de forma estável, evitando o limite de linhas padrão do Supabase e preservando IDs, datas ISO e valores decimais sem ambiguidade.

## Itens deliberadamente excluídos

Não são incluídos PDFs, CSVs ou outros binários privados guardados no Storage. A exportação também remove caminhos internos do Storage, URLs assinadas, cookies, credenciais, service role, chaves administrativas e chaves privadas. Esses itens são capacidades de acesso, não dados necessários para auditar o modelo financeiro.

O CSV protege textos que poderiam ser interpretados como fórmulas por planilhas: valores textuais iniciados por `=`, `+`, `-`, `@`, tabulação ou retorno de carro recebem o prefixo literal apropriado.

## Privacidade

O arquivo contém dados financeiros estruturados e deve ser armazenado em local seguro. O endpoint não registra o payload financeiro integral em logs. Uma falha de consulta encerra a geração e retorna uma mensagem segura; nenhum arquivo parcial é entregue.

## Restauração conceitual

Para reconstruir os dados em outra instalação compatível, importe primeiro perfil, instituições referenciadas, contas, cartões, categorias, pessoas e subcategorias. Em seguida, importe os metadados de importação e registros brutos, transações e seus vínculos. Por último, aplique alocações, razão e settlements de terceiros, parcelas, regras, pendências, fechamentos e eventos de auditoria. Preserve os UUIDs para manter todas as referências entre os conjuntos.

## Limitações conhecidas

- A exportação é um backup manual; não cria cópia automática externa.
- Arquivos binários originais não podem ser recriados por este pacote. Caso sejam necessários, precisam ser preservados separadamente, respeitando a política de retenção e privacidade.
- A restauração automatizada não faz parte da V1; este formato é documentado para viabilizar reconstrução, auditoria e portabilidade.
