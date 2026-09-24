import Link from "next/link";

import {
  buildCategoryEvolution,
  buildHistoryRows,
  closingStatusLabel,
  requiresQualityAlert,
  type ClosingStatus,
  type HistoryRange,
} from "@/features/history/history-data";
import { TerraPage } from "@/features/ui/terra-page";
import { createClient } from "@/lib/supabase/server";

import styles from "./history.module.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const RANGE_OPTIONS: Array<{ value: HistoryRange; label: string }> = [
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "year", label: "Ano" },
  { value: "all", label: "Tudo" },
];

function monthLabel(value: string) {
  return monthFormat.format(new Date(`${value}T00:00:00Z`));
}

function validRange(value: string | undefined): HistoryRange {
  return RANGE_OPTIONS.some((option) => option.value === value)
    ? (value as HistoryRange)
    : "6m";
}

function historyHref(range: HistoryRange, year?: string, category?: string) {
  const params = new URLSearchParams({ range });
  if (range === "year" && year) params.set("year", year);
  if (category) params.set("category", category);
  return `/history?${params.toString()}`;
}

function statusClass(status: ClosingStatus) {
  if (status === "closed") return styles.closed;
  if (status === "closed_with_pending") return styles.pending;
  return styles.progress;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; range?: string; year?: string }>;
}) {
  const {
    category: categoryId,
    range: requestedRange,
    year: requestedYear,
  } = await searchParams;
  const range = validRange(requestedRange);
  const supabase = await createClient();
  const [historyResult, closingsResult, categoriesResult, transactionsResult] =
    await Promise.all([
      supabase.rpc("monthly_metrics_history"),
      supabase.from("monthly_closings").select("month, status"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("kind", "expense")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("transactions")
        .select(
          "competence_month, nature, category_id, is_void, allocations(owner_type, amount)",
        )
        .in("nature", ["expense", "reversal"])
        .order("competence_month", { ascending: true })
        .limit(5000),
    ]);

  if (
    historyResult.error ||
    closingsResult.error ||
    categoriesResult.error ||
    transactionsResult.error
  ) {
    return (
      <TerraPage current="/history">
        <section className={`card ${styles.page}`}>
          <Link className="back-link" href="/dashboard">
            ← Visão geral
          </Link>
          <p className="eyebrow">Histórico</p>
          <h1>Evolução por competência</h1>
          <section className={styles.error} role="alert">
            <h2>Não foi possível carregar o histórico</h2>
            <p>
              Atualize a página. Se o problema continuar, confira sua conexão e
              se as atualizações do banco foram aplicadas.
            </p>
            <Link className="button secondary" href="/history">
              Tentar novamente
            </Link>
          </section>
        </section>
      </TerraPage>
    );
  }

  const closingStatusByMonth = new Map(
    (closingsResult.data ?? []).map((closing) => [
      closing.month,
      closing.status as ClosingStatus,
    ]),
  );
  const periods = (historyResult.data ?? []).map((period) => ({
    competenceMonth: period.competence_month,
    income: period.income,
    personalExpenses: period.personal_expenses,
    closingStatus:
      closingStatusByMonth.get(period.competence_month) ?? "in_progress",
  }));
  const availableYears = [
    ...new Set(periods.map((period) => period.competenceMonth.slice(0, 4))),
  ].sort();
  const selectedYear = availableYears.includes(requestedYear ?? "")
    ? requestedYear
    : availableYears.at(-1);
  const rows = buildHistoryRows(periods, range, selectedYear);
  const selectedCategory = (categoriesResult.data ?? []).find(
    (category) => category.id === categoryId,
  );
  const categoryEvolution = selectedCategory
    ? buildCategoryEvolution(
        selectedCategory.id,
        (transactionsResult.data ?? []).map((transaction) => ({
          competenceMonth: transaction.competence_month,
          nature: transaction.nature,
          categoryId: transaction.category_id,
          isVoid: transaction.is_void,
          allocations: (transaction.allocations ?? []).map((allocation) => ({
            ownerType: allocation.owner_type,
            amount: allocation.amount,
          })),
        })),
        rows,
      )
    : [];
  const chartMaximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.income, Math.abs(row.personalExpenses)]),
  );
  const categoryMaximum = Math.max(
    1,
    ...categoryEvolution.map((point) => Math.abs(point.personalExpenses)),
  );

  return (
    <TerraPage current="/history">
      <section className={`card ${styles.page}`}>
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Histórico</p>
        <h1>Evolução por competência</h1>
        <p className="muted">
          Valores realizados por competência. Pagamentos de fatura,
          transferências e investimentos não entram como gasto ou receita.
        </p>

        {!periods.length ? (
          <section className={styles.empty}>
            <h2>Seu histórico começa com uma importação</h2>
            <p>
              Importe um extrato ou uma fatura para acompanhar receitas, gastos
              pessoais e compromissos por mês.
            </p>
            <Link className="button primary" href="/imports">
              Importar dados
            </Link>
          </section>
        ) : (
          <>
            <nav aria-label="Período do histórico" className={styles.filters}>
              {RANGE_OPTIONS.map((option) => (
                <Link
                  aria-current={range === option.value ? "page" : undefined}
                  className={
                    range === option.value ? styles.activeFilter : undefined
                  }
                  href={historyHref(option.value, selectedYear, categoryId)}
                  key={option.value}
                >
                  {option.label}
                </Link>
              ))}
              {range === "year" ? (
                <form method="get">
                  <input name="range" type="hidden" value="year" />
                  {categoryId ? (
                    <input name="category" type="hidden" value={categoryId} />
                  ) : null}
                  <label>
                    <span className="sr-only">Ano do histórico</span>
                    <select defaultValue={selectedYear} name="year">
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" type="submit">
                    Ver ano
                  </button>
                </form>
              ) : null}
            </nav>

            <section
              aria-labelledby="history-chart-title"
              className={styles.chart}
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className="eyebrow">Comparação mensal</p>
                  <h2 id="history-chart-title">Receitas × gastos pessoais</h2>
                </div>
                <p>Os valores textuais mantêm a comparação acessível.</p>
              </div>
              <ul className={styles.bars}>
                {rows.map((row) => (
                  <li key={row.competenceMonth}>
                    <div className={styles.barLabel}>
                      <Link
                        href={`/movements?month=${row.competenceMonth.slice(0, 7)}`}
                      >
                        {monthLabel(row.competenceMonth)}
                      </Link>
                      <span>
                        Receita {money.format(row.income)} · gastos{" "}
                        {money.format(row.personalExpenses)}
                      </span>
                    </div>
                    <div aria-hidden="true" className={styles.barTracks}>
                      <span>
                        <i
                          className={styles.incomeBar}
                          style={{
                            width: `${(row.income / chartMaximum) * 100}%`,
                          }}
                        />
                      </span>
                      <span>
                        <i
                          className={styles.expenseBar}
                          style={{
                            width: `${(Math.abs(row.personalExpenses) / chartMaximum) * 100}%`,
                          }}
                        />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="history-table-title"
              className={styles.tableSection}
            >
              <h2 id="history-table-title">Detalhe mensal</h2>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Competência</th>
                      <th scope="col">Fechamento</th>
                      <th scope="col">Receitas</th>
                      <th scope="col">Gastos pessoais</th>
                      <th scope="col">Resultado</th>
                      <th scope="col">Renda consumida</th>
                      <th scope="col">Resultado vs. mês anterior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.competenceMonth}>
                        <th scope="row">
                          <Link
                            href={`/movements?month=${row.competenceMonth.slice(0, 7)}`}
                          >
                            {monthLabel(row.competenceMonth)}
                          </Link>
                        </th>
                        <td>
                          <span
                            className={`${styles.status} ${statusClass(row.closingStatus)}`}
                          >
                            {closingStatusLabel(row.closingStatus)}
                          </span>
                          {requiresQualityAlert(row.closingStatus) ? (
                            <p className={styles.qualityAlert}>
                              Qualidade: fechado com pendências.
                            </p>
                          ) : null}
                        </td>
                        <td>{money.format(row.income)}</td>
                        <td>{money.format(row.personalExpenses)}</td>
                        <td>{money.format(row.result)}</td>
                        <td>
                          {row.incomeConsumedPercent === null
                            ? "Não aplicável"
                            : `${row.incomeConsumedPercent.toLocaleString(
                                "pt-BR",
                                {
                                  maximumFractionDigits: 1,
                                },
                              )}%`}
                        </td>
                        <td>
                          {row.differenceFromPrevious === null
                            ? "Sem base comparável"
                            : `${money.format(row.differenceFromPrevious)} · ${
                                row.variationFromPreviousPercent === null
                                  ? "sem base comparável"
                                  : `${row.variationFromPreviousPercent.toLocaleString(
                                      "pt-BR",
                                      {
                                        maximumFractionDigits: 1,
                                      },
                                    )}%`
                              }`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              aria-labelledby="category-history-title"
              className={styles.category}
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className="eyebrow">Categoria</p>
                  <h2 id="category-history-title">
                    Evolução de gastos pessoais
                  </h2>
                </div>
                <p>Estornos reduzem o valor; partes de terceiros ficam fora.</p>
              </div>
              <form className={styles.categoryForm} method="get">
                <input name="range" type="hidden" value={range} />
                {range === "year" && selectedYear ? (
                  <input name="year" type="hidden" value={selectedYear} />
                ) : null}
                <label htmlFor="history-category">
                  Categoria para acompanhar
                </label>
                <select
                  defaultValue={selectedCategory?.id ?? ""}
                  id="history-category"
                  name="category"
                >
                  <option value="">Selecione uma categoria</option>
                  {(categoriesResult.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button className="button secondary" type="submit">
                  Ver evolução
                </button>
              </form>
              {selectedCategory ? (
                <ul className={styles.categoryPoints}>
                  {categoryEvolution.map((point) => (
                    <li key={point.competenceMonth}>
                      <Link
                        href={`/movements?month=${point.competenceMonth.slice(0, 7)}&category=${selectedCategory.id}`}
                      >
                        {monthLabel(point.competenceMonth)}
                      </Link>
                      <span>{money.format(point.personalExpenses)}</span>
                      <i
                        aria-hidden="true"
                        style={{
                          width: `${(Math.abs(point.personalExpenses) / categoryMaximum) * 100}%`,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.helper}>
                  Selecione uma categoria para ver somente sua parte atribuída a
                  você em cada competência.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    </TerraPage>
  );
}
