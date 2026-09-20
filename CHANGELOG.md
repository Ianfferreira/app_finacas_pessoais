# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

## [Unreleased]

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
