import type { ReactNode } from "react";

import Link from "next/link";

import type { CategoryBreakdown } from "./category-breakdown";
import { movementsDrilldownHref } from "./category-breakdown";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  href: string;
  actionLabel: string;
  featured?: boolean;
};

type FinanceDashboardProps = {
  categoryBreakdown: CategoryBreakdown;
  closingLabel: string;
  isPreliminary: boolean;
  metrics: DashboardMetric[];
  month: string;
  monthLabel: string;
  navigation: { previous: string; next: string };
  pendingCount: number;
  personalExpenses: number;
  personName?: string | null;
  statusMessage?: ReactNode;
  footerActions: ReactNode;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function percentage(value: number, total: number): string | null {
  if (total <= 0) return null;
  return `${((value / total) * 100).toFixed(1).replace(".", ",")}%`;
}

export function MetricCard({
  actionLabel,
  detail,
  featured = false,
  href,
  label,
  value,
}: DashboardMetric) {
  return (
    <article className={`terra-metric-card${featured ? " is-featured" : ""}`}>
      <p className="terra-metric-label">{label}</p>
      <strong className="terra-metric-value">{value}</strong>
      <p className="terra-metric-detail">{detail}</p>
      <Link className="terra-inline-link" href={href}>
        {actionLabel} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

function QualityBar({
  categorizedTotal,
  closingLabel,
  expenses,
  isPreliminary,
  pendingCount,
}: {
  categorizedTotal: number;
  closingLabel: string;
  expenses: number;
  isPreliminary: boolean;
  pendingCount: number;
}) {
  const categoryCoverage = percentage(categorizedTotal, expenses);

  return (
    <section className="terra-quality-bar" aria-label="Qualidade do mês">
      <div>
        <span>Gastos categorizados</span>
        <strong>{categoryCoverage ?? "Sem base válida"}</strong>
      </div>
      <div>
        <span>Titularidade</span>
        <strong>Revisão por movimentação</strong>
      </div>
      <div>
        <span>Pendências</span>
        <strong>
          {pendingCount ? `${pendingCount} a revisar` : "Nenhuma"}
        </strong>
      </div>
      <div>
        <span>Fechamento</span>
        <strong>{isPreliminary ? "Preliminar" : closingLabel}</strong>
      </div>
    </section>
  );
}

function CategoryBreakdownPanel({
  breakdown,
  month,
  personalExpenses,
}: {
  breakdown: CategoryBreakdown;
  month: string;
  personalExpenses: number;
}) {
  const reviewShare = breakdown.uncategorized
    ? percentage(breakdown.uncategorized.personal_expenses, personalExpenses)
    : null;

  return (
    <section
      className="terra-panel"
      aria-labelledby="category-breakdown-heading"
    >
      <header className="terra-panel-heading">
        <div>
          <h2 id="category-breakdown-heading">Para onde foi meu dinheiro?</h2>
          <p>Participação sobre os gastos pessoais já categorizados.</p>
        </div>
        <p className="terra-panel-total">
          <span>Total categorizado</span>
          {currency.format(breakdown.categorized_total)}
        </p>
      </header>

      {breakdown.categorized.length ? (
        <ul className="terra-category-list">
          {breakdown.categorized.map((category) => (
            <li key={category.category_id ?? category.category_name}>
              <Link href={movementsDrilldownHref(month, category.category_id)}>
                <span className="terra-category-name">
                  {category.category_name}
                </span>
                <span
                  className="terra-category-track"
                  role="progressbar"
                  aria-label={`Participação de ${category.category_name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    category.percentage_of_categorized ?? undefined
                  }
                >
                  <span
                    className="terra-category-fill"
                    style={{
                      width: `${category.percentage_of_categorized ?? 0}%`,
                    }}
                  />
                </span>
                <span className="terra-category-amount">
                  {currency.format(category.personal_expenses)}
                  {category.percentage_of_categorized !== null
                    ? ` · ${category.percentage_of_categorized.toFixed(1).replace(".", ",")}%`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="terra-empty-state">
          Ainda não há gastos pessoais categorizados neste mês.
        </p>
      )}

      {breakdown.uncategorized ? (
        <div className="terra-review-row">
          <div>
            <strong>A revisar</strong>
            <span>
              {currency.format(breakdown.uncategorized.personal_expenses)}
              {reviewShare
                ? ` · ${reviewShare} dos gastos pessoais capturados`
                : ""}
            </span>
          </div>
          <Link href={movementsDrilldownHref(month)}>Ver movimentações →</Link>
        </div>
      ) : null}
    </section>
  );
}

function InsightList({ breakdown }: { breakdown: CategoryBreakdown }) {
  const insights = breakdown.categorized.slice(0, 3);

  return (
    <aside
      className="terra-panel terra-insight-panel"
      aria-labelledby="insights-heading"
    >
      <header className="terra-panel-heading">
        <div>
          <h2 id="insights-heading">Insights factuais</h2>
          <p>Observações descritivas do ciclo.</p>
        </div>
      </header>
      {insights.length ? (
        <ul className="terra-insight-list">
          {insights.map((category) => (
            <li key={category.category_id ?? category.category_name}>
              <strong>{category.category_name}</strong>
              <span>
                {currency.format(category.personal_expenses)}
                {category.percentage_of_categorized !== null
                  ? ` · ${category.percentage_of_categorized.toFixed(1).replace(".", ",")}% do categorizado`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="terra-empty-state">
          Os insights aparecem quando houver gastos categorizados.
        </p>
      )}
    </aside>
  );
}

export function FinanceDashboard({
  categoryBreakdown,
  closingLabel,
  footerActions,
  isPreliminary,
  metrics,
  month,
  monthLabel,
  navigation,
  pendingCount,
  personalExpenses,
  personName,
  statusMessage,
}: FinanceDashboardProps) {
  return (
    <div className="terra-app-shell">
      <aside className="terra-sidebar" aria-label="Navegação principal">
        <Link className="terra-brand" href="/dashboard">
          <span className="terra-brand-mark" aria-hidden="true">
            ▣
          </span>
          <span>
            <strong>Finanças pessoais</strong>
            <small>Clareza para decidir</small>
          </span>
        </Link>
        <nav className="terra-navigation">
          <Link aria-current="page" href="/dashboard">
            Visão geral
          </Link>
          <Link href="/movements">Movimentações</Link>
          <Link href="/review">
            Revisão{pendingCount ? ` · ${pendingCount}` : ""}
          </Link>
          <Link href="/third-parties">Terceiros</Link>
          <Link href="/history">Histórico</Link>
          <Link href="/commitments">Compromissos</Link>
          <Link href="/imports">Importações</Link>
          <Link href="/rules">Regras</Link>
        </nav>
        <Link className="terra-settings-link" href="/settings">
          Configurações
        </Link>
      </aside>

      <main className="terra-dashboard-main">
        <header className="terra-topbar">
          <nav
            className="terra-month-navigation"
            aria-label="Navegação entre meses"
          >
            <Link aria-label="Mês anterior" href={navigation.previous}>
              ←
            </Link>
            <span>{monthLabel}</span>
            <Link aria-label="Próximo mês" href={navigation.next}>
              →
            </Link>
          </nav>
          <div className="terra-topbar-actions">
            <span
              className={`terra-status${isPreliminary ? " is-preliminary" : ""}`}
            >
              {isPreliminary ? "Números preliminares" : closingLabel}
            </span>
            <Link className="button primary" href="/imports">
              Importar arquivos
            </Link>
          </div>
        </header>

        <div className="terra-dashboard-content">
          <section className="terra-dashboard-intro">
            <p className="eyebrow">Competência financeira</p>
            <h1>
              {personName ? `Olá, ${personName}` : "Seu panorama financeiro"}
            </h1>
            <p>
              Uma leitura econômica de {monthLabel.toLocaleLowerCase()},
              separada do fluxo bancário e pronta para auditoria.
            </p>
          </section>

          {statusMessage}

          <QualityBar
            categorizedTotal={categoryBreakdown.categorized_total}
            closingLabel={closingLabel}
            expenses={personalExpenses}
            isPreliminary={isPreliminary}
            pendingCount={pendingCount}
          />

          <section
            className="terra-metric-grid"
            aria-label="Métricas principais"
          >
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="terra-dashboard-columns">
            <CategoryBreakdownPanel
              breakdown={categoryBreakdown}
              month={month}
              personalExpenses={personalExpenses}
            />
            <InsightList breakdown={categoryBreakdown} />
          </section>

          <section
            className="terra-secondary-grid"
            aria-label="Atalhos financeiros"
          >
            <article className="terra-panel terra-compact-panel">
              <h2>Terceiros</h2>
              <p>
                Saldos, reembolsos e créditos permanecem separados do orçamento
                pessoal.
              </p>
              <Link className="terra-inline-link" href="/third-parties">
                Abrir razão de terceiros →
              </Link>
            </article>
            <article className="terra-panel terra-compact-panel">
              <h2>Compromissos conhecidos</h2>
              <p>
                Parcelas contratadas e valores futuros, sem projeções
                probabilísticas.
              </p>
              <Link className="terra-inline-link" href="/commitments">
                Ver cronograma →
              </Link>
            </article>
          </section>

          <footer className="terra-dashboard-footer">{footerActions}</footer>
        </div>
      </main>
    </div>
  );
}
