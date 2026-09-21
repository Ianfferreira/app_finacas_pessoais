# Finanças Pessoais

Aplicação web de inteligência financeira pessoal definida em `MASTER_SPEC.md`.
O repositório possui fundação segura, núcleo financeiro auditável e o primeiro
fluxo vertical: importação de extrato CSV Nubank, armazenamento privado,
evidência imutável e listagem de movimentações. A interface também permite
confirmar manualmente a natureza econômica de uma movimentação.

## Pré-requisitos

- Node.js 22 ou superior;
- pnpm 11.19.0;
- runtime compatível com Docker para o Supabase local;
- Supabase CLI (instalada como dependência de desenvolvimento).

As funções essenciais da V1 devem permanecer compatíveis com free tiers e sem
API paga obrigatória.

## Configuração local

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Copie `.env.example` para `.env.local`.
3. Inicie o Supabase local e anote a URL e a chave publicável/anon exibidas:

   ```bash
   pnpm db:start
   ```

4. Atualize `.env.local` com esses valores e aplique a base desde o início:

   ```bash
   pnpm db:reset
   pnpm db:test
   pnpm db:types
   ```

5. Inicie a aplicação:

   ```bash
   pnpm dev
   ```

Acesse `http://localhost:3000`. O seed contém somente uma identidade sintética
sem senha. Para validar o login manualmente, crie um usuário local pela interface
do Supabase Studio em `http://127.0.0.1:54323` ou use o cadastro da aplicação.

## Variáveis de ambiente

| Variável                               | Uso                                                      |
| -------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL pública do projeto Supabase                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (ou `anon` legada) protegida por RLS    |
| `NEXT_PUBLIC_SITE_URL`                 | Origem usada no link de confirmação; opcional localmente |

Nunca exponha `service_role` no cliente nem a registre em variáveis com prefixo
`NEXT_PUBLIC_`.

## Comandos

| Comando                             | Finalidade                                          |
| ----------------------------------- | --------------------------------------------------- |
| `pnpm dev`                          | servidor de desenvolvimento                         |
| `pnpm format` / `pnpm format:check` | formatar ou verificar arquivos                      |
| `pnpm lint`                         | ESLint com zero warnings                            |
| `pnpm typecheck`                    | TypeScript estrito sem emissão                      |
| `pnpm test`                         | testes unitários Vitest                             |
| `pnpm build`                        | build de produção                                   |
| `pnpm check`                        | verificações da aplicação em sequência              |
| `pnpm db:start` / `pnpm db:stop`    | iniciar ou parar o Supabase local                   |
| `pnpm db:reset`                     | recriar o banco e repetir migrations + seed         |
| `pnpm db:test`                      | testes pgTAP, incluindo RLS multiusuário            |
| `pnpm db:types`                     | regenerar tipos TypeScript a partir do schema local |

## Banco e segurança

Cada tabela de dados do usuário possui RLS habilitada e forçada, com políticas
explícitas por operação. O fluxo de importação armazena o arquivo no bucket
privado `financial-imports`, sob um caminho iniciado pelo UUID de seu dono; a
mesma pessoa não consegue enviar novamente um conteúdo de mesmo SHA-256. O
arquivo e os `raw_records` são evidências imutáveis; `transactions` e
`allocations` são a interpretação editável.

`transaction_links` registra conciliações entre duas transações do mesmo
usuário — estorno, pagamento de fatura, transferência própria, liquidação de
terceiro, duplicidade ou relação genérica. A confirmação de natureza na tela de
Movimentações é manual e grava a proveniência e o lock dessa decisão; não cria
classificações automáticas.

Mudanças estruturais futuras devem ser novas migrations forward-only. Depois de
qualquer migration, execute `pnpm db:reset`, `pnpm db:test` e `pnpm db:types`.
Como os tipos do Supabase refletem o banco aplicado, após aplicar a migration
financeira no projeto online também será necessário regenerá-los num Supabase
local ou conectado; nenhuma chave administrativa é guardada neste repositório.

## CI

`.github/workflows/quality.yml` executa formatação, lint, typecheck, testes e
build. Um job separado sobe um Supabase limpo, reaplica migrations e seed,
executa os testes de RLS, regenera os tipos e repete o typecheck.

## Documentação

- `MASTER_SPEC.md`: fonte de verdade funcional da V1;
- `CODEX.md`: ordem de implementação e critérios de conclusão;
- `CHANGELOG.md`: entregas por fase;
- `docs/decisions/`: decisões técnicas duradouras;
- `docs/data-dictionary.md`: schema efetivamente implementado.
