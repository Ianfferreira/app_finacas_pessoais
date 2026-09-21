# Checkpoint — Fase 0: Fundação

Data: 2026-09-20

## Estado inicial auditado

O repositório continha somente `MASTER_SPEC.md`, `CODEX.md`, `AGENTS.md` e um
README de transição. O Git estava limpo na branch `main`. Não existiam aplicação,
package manager configurado, migrations, testes, CI ou exemplo de ambiente.

## Entrega da fase

- Next.js App Router e TypeScript estrito;
- formatação, lint, testes unitários, typecheck e build;
- clientes Supabase para browser e servidor, sessão SSR e proxy de renovação;
- cadastro, confirmação, login, logout e rota de perfil protegida;
- migration `public.profiles`, criação automática a partir de `auth.users`,
  backfill seguro, constraints e timestamps;
- RLS forçada com políticas explícitas para as quatro operações;
- seed sintético sem senha ou dado pessoal;
- pgTAP com usuários A/B/C sintéticos e cenários de select/insert/update/delete;
- geração de tipos via Supabase CLI e CI em banco limpo;
- README, changelog, ADR e dicionário de dados.

## Verificações executadas

| Verificação                           | Resultado                                |
| ------------------------------------- | ---------------------------------------- |
| Prettier                              | passou                                   |
| ESLint, zero warnings                 | passou                                   |
| TypeScript estrito                    | passou                                   |
| Vitest                                | 3 arquivos, 10 testes passaram           |
| Next.js build                         | passou; 4 rotas da aplicação + not-found |
| Auditoria de dependências de produção | nenhuma vulnerabilidade conhecida        |
| Supabase CLI                          | versão 2.117.0 validada                  |
| Fluxo remoto Auth → perfil            | passou manualmente com Supabase online   |
| Supabase local / pgTAP                | passou em banco limpo em 2026-09-21      |

## Escopo deliberadamente não iniciado

Nenhuma tabela ou funcionalidade de contas, cartões, categorias, pessoas,
importações, registros brutos, transações, rateios, métricas ou dashboard foi
criada. Storage privado de importações permanece para a etapa correspondente.

## Validação complementar concluída

Com Docker Desktop local, a sequência `pnpm db:start`, `pnpm db:reset`,
`pnpm db:test` e `pnpm db:types` foi executada em 2026-09-21. As migrations
aplicaram em banco limpo e os testes de RLS passaram. O job `database` da CI
repete essa sequência automaticamente a cada alteração compatível.
