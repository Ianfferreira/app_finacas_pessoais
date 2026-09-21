# Finanças Pessoais

Aplicação web de inteligência financeira pessoal definida em `MASTER_SPEC.md`.
O repositório concluiu a fundação e possui o núcleo de domínio financeiro
versionado. Ainda não há upload, parser ou dashboard de produto.

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

A migration inicial cria apenas `public.profiles` e um perfil 1:1 para cada
identidade do Supabase Auth. A tabela possui RLS forçada e políticas explícitas
para `select`, `insert`, `update` e `delete`. Um teste com usuários sintéticos A
e B confirma que nenhum deles lê ou altera o perfil do outro; requisições
anônimas não leem perfis.

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
