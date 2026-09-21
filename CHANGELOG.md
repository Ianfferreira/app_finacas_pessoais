# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

## [Unreleased]

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
