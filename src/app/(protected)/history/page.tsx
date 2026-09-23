import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { TerraPage } from "@/features/ui/terra-page";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: periods } = await supabase.rpc("monthly_metrics_history");
  return (
    <TerraPage current="/history">
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
        {!periods?.length ? (
          <p className="muted">Ainda não há histórico suficiente.</p>
        ) : (
          <ul className="stack">
            {periods.map((period) => (
              <li className="movement" key={period.competence_month}>
                <strong>{period.competence_month}</strong>
                <br />
                <span className="muted">
                  Receitas {money.format(period.income)} · gastos{" "}
                  {money.format(period.personal_expenses)} · resultado{" "}
                  {money.format(period.income - period.personal_expenses)}
                  {period.income
                    ? ` · renda consumida ${((period.personal_expenses / period.income) * 100).toFixed(1)}%`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TerraPage>
  );
}
