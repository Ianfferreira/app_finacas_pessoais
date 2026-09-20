# ADR 0001 — Fundação Next.js e Supabase

- Status: aceito
- Data: 2026-09-20

## Contexto

A Fase 0 precisa estabelecer a fronteira de autenticação e isolamento antes de
qualquer entidade financeira. A especificação define Next.js, TypeScript e
Supabase PostgreSQL/Auth/Storage, com operação possível em free tier.

## Decisão

- Usar Next.js App Router e Server Components por padrão.
- Usar `@supabase/ssr` para transportar a sessão em cookies e um `proxy.ts` para
  validar/renovar tokens antes de rotas protegidas.
- Aceitar no callback tanto o código PKCE padrão quanto `token_hash` de templates
  de e-mail customizados, sem depender de uma configuração remota específica.
- Tratar RLS, e não filtros da interface, como a fronteira de autorização.
- Manter migrations SQL forward-only em `supabase/migrations` e testes pgTAP de
  isolamento em `supabase/tests/database`.
- Criar nesta fase somente `public.profiles`. As entidades financeiras e o
  bucket privado de importação permanecem fora do escopo até suas etapas.
- Manter o domínio futuro independente de React e do SDK do Supabase.

## Consequências

- O caminho mínimo Auth → perfil já pode ser validado de ponta a ponta.
- O ambiente local completo requer um runtime compatível com Docker para subir
  o Supabase; a CI repete migrations e testes em banco limpo.
- `@supabase/ssr` continua marcado como beta pelo fornecedor; upgrades precisam
  revisar o contrato de cookies/proxy.
- BRL e `America/Sao_Paulo` são defaults configuráveis do perfil, não constantes
  de cálculo financeiro.
