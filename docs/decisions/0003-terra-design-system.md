# 0003 — Design system Terra

## Contexto

A primeira implementação visual usava azul/índigo como cor principal, mas o
protótipo validado para a Visão Geral mostrou uma linguagem mais calma e
distintiva baseada em neutros quentes e verde-floresta. A decisão não altera
regras financeiras, cálculos ou a separação entre dado bruto e interpretação.

## Decisão

Adotar o design system Terra para a interface da V1:

- verde-floresta é a cor principal de marca, ações primárias e seleção;
- ocre é reservado para atenção e números preliminares;
- vermelho é reservado para erro e risco, nunca para todo gasto;
- Nunito Sans é a fonte de interface; Literata aparece apenas em títulos
  editoriais;
- tokens de superfície, texto, borda, espaçamento e raio são a fonte visual
  compartilhada pelos componentes.

## Consequências

O dashboard passa a usar componentes reutilizáveis para shell, barra de
qualidade, cartões de métrica, detalhamento de categorias e insights. As telas
restantes podem adotar os mesmos tokens incrementalmente, sem alterar o
domínio financeiro ou os contratos de dados existentes.
