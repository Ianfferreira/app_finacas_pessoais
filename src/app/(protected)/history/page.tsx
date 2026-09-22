import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("competence_month, amount, direction, nature")
    .eq("is_void", false)
    .order("competence_month", { ascending: false })
    .limit(2000);
  const periods = new Map<string, { income: number; expense: number }>();
  for (const row of data ?? []) {
    const period = periods.get(row.competence_month) ?? {
      income: 0,
      expense: 0,
    };
    if (
      row.direction === "inflow" &&
      (row.nature === "income" || row.nature === "investment_income")
    )
      period.income += row.amount;
    if (row.direction === "outflow" && row.nature === "expense")
      period.expense += row.amount;
    periods.set(row.competence_month, period);
  }
  return (
    <main className="centered-page">
      <section className="card">
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Histórico</p>
        <h1>Evolução por competência</h1>
        <p className="muted">
          Compare meses já importados. Percentuais só aparecem quando existe
          renda válida no período.
        </p>
        {!periods.size ? (
          <p className="muted">Ainda não há histórico suficiente.</p>
        ) : (
          <ul className="stack">
            {[...periods.entries()].map(([month, values]) => (
              <li className="movement" key={month}>
                <strong>{month}</strong>
                <br />
                <span className="muted">
                  Receitas {money.format(values.income)} · gastos{" "}
                  {money.format(values.expense)} · resultado{" "}
                  {money.format(values.income - values.expense)}
                  {values.income
                    ? ` · renda consumida ${((values.expense / values.income) * 100).toFixed(1)}%`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
