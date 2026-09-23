import Link from "next/link";
import { redirect } from "next/navigation";

import {
  buildCategoryBreakdown,
  movementsDrilldownHref,
} from "@/features/dashboard/category-breakdown";
import { createClient } from "@/lib/supabase/server";

import { closeCurrentMonth, reopenCurrentMonth, signOut } from "./actions";

const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function currentMonth() {
  const today = new Date();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function monthFromSearchParam(value: string | undefined): string {
  if (!value || !MONTH.test(value)) return currentMonth();
  return `${value}-01`;
}

function shiftMonth(month: string, offset: number): string {
  const [year, value] = month.slice(0, 7).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; month?: string; success?: string }>;
}) {
  const { error, month: requestedMonth, success } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/dashboard");

  const month = monthFromSearchParam(requestedMonth);
  const monthKey = month.slice(0, 7);
  const [
    { data: profile },
    { data: metrics },
    { data: categoryMetrics },
    { data: categories },
    review,
    { data: closing },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single(),
    supabase.rpc("month_metrics", { target_month: month }).maybeSingle(),
    supabase.rpc("month_category_metrics", { target_month: month }),
    supabase.from("categories").select("id, name").eq("kind", "expense"),
    supabase
      .from("review_items")
      .select("id, transactions!inner(competence_month)", {
        count: "exact",
        head: true,
      })
      .eq("status", "open")
      .eq("transactions.competence_month", month),
    supabase
      .from("monthly_closings")
      .select("status, version")
      .eq("month", month)
      .maybeSingle(),
  ]);

  const income = metrics?.income ?? 0;
  const expenses = metrics?.personal_expenses ?? 0;
  const categoryBreakdown = buildCategoryBreakdown(
    categoryMetrics ?? [],
    categories ?? [],
  );
  const insights = categoryBreakdown.categorized.slice(0, 3);

  return (
    <main className="centered-page">
      <section className="card profile-card">
        <p className="eyebrow">Visão geral</p>
        <h1>
          {profile?.display_name ? `Olá, ${profile.display_name}` : "Seu mês"}
        </h1>
        <p className="muted">
          Competência {month.slice(0, 7)}. Valores permanecem preliminares
          enquanto existirem pendências de revisão.
        </p>
        <p className="month-navigation" aria-label="Navegação entre meses">
          <Link href={`/dashboard?month=${shiftMonth(month, -1)}`}>
            ← Mês anterior
          </Link>
          <Link href={`/dashboard?month=${shiftMonth(month, 1)}`}>
            Próximo mês →
          </Link>
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        <dl className="profile-grid">
          <div>
            <dt>Receitas</dt>
            <dd>{formatCurrency.format(income)}</dd>
          </div>
          <div>
            <dt>Gastos pessoais</dt>
            <dd>{formatCurrency.format(expenses)}</dd>
          </div>
          <div>
            <dt>Resultado</dt>
            <dd>{formatCurrency.format(income - expenses)}</dd>
          </div>
          <div>
            <dt>Renda consumida</dt>
            <dd>
              {income
                ? `${((expenses / income) * 100).toFixed(1)}%`
                : "Sem base válida"}
            </dd>
          </div>
          <div>
            <dt>Pendências</dt>
            <dd>{review.count ?? 0}</dd>
          </div>
          <div>
            <dt>Fechamento</dt>
            <dd>
              {closing
                ? `${closing.status} · v${closing.version}`
                : "em andamento"}
            </dd>
          </div>
        </dl>
        <section aria-labelledby="category-breakdown-heading">
          <h2 id="category-breakdown-heading">Para onde foi meu dinheiro?</h2>
          <p className="muted">
            Percentuais usam somente o total já categorizado. Cada linha abre as
            movimentações que formam o valor.
          </p>
          {categoryBreakdown.categorized.length ? (
            <ul className="category-breakdown">
              {categoryBreakdown.categorized.map((category) => (
                <li key={category.category_id ?? category.category_name}>
                  <Link
                    href={movementsDrilldownHref(month, category.category_id)}
                  >
                    <strong>{category.category_name}</strong>
                    <span>
                      {formatCurrency.format(category.personal_expenses)}
                      {category.percentage_of_categorized !== null
                        ? ` · ${category.percentage_of_categorized.toFixed(1)}%`
                        : " · sem base percentual"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ainda não há gastos pessoais categorizados.</p>
          )}
          {categoryBreakdown.uncategorized ? (
            <p className="notice review-notice">
              A revisar:{" "}
              {formatCurrency.format(
                categoryBreakdown.uncategorized.personal_expenses,
              )}
              {expenses > 0
                ? ` · ${((categoryBreakdown.uncategorized.personal_expenses / expenses) * 100).toFixed(1)}% dos gastos pessoais capturados`
                : ""}
              .{" "}
              <Link href={movementsDrilldownHref(month)}>
                Ver movimentações
              </Link>
            </p>
          ) : null}
        </section>
        <h2>Insights factuais</h2>
        <ul>
          {insights.length ? (
            insights.map((category) => (
              <li key={category.category_id ?? category.category_name}>
                {category.category_name}:{" "}
                {formatCurrency.format(category.personal_expenses)}
                {category.percentage_of_categorized !== null
                  ? ` (${category.percentage_of_categorized.toFixed(1)}% do categorizado)`
                  : ""}
              </li>
            ))
          ) : (
            <li className="muted">
              Ainda não há gastos pessoais classificados.
            </li>
          )}
        </ul>
        <div className="stack">
          <Link className="button primary" href="/imports">
            Importar arquivos
          </Link>
          <Link className="button secondary" href="/movements">
            Movimentações
          </Link>
          <Link className="button secondary" href="/review">
            Revisão
          </Link>
          <Link className="button secondary" href="/history">
            Histórico
          </Link>
          <Link className="button secondary" href="/commitments">
            Compromissos
          </Link>
          <Link className="button secondary" href="/settings">
            Configurações
          </Link>
          <Link className="button secondary" href="/third-parties">
            Terceiros e reembolsos
          </Link>
          {closing?.status === "in_progress" || !closing ? (
            <form action={closeCurrentMonth}>
              <input name="month" type="hidden" value={month} />
              <button className="button secondary" type="submit">
                Fechar {monthKey}
              </button>
            </form>
          ) : (
            <form action={reopenCurrentMonth}>
              <input name="month" type="hidden" value={month} />
              <button className="button secondary" type="submit">
                Reabrir {monthKey}
              </button>
            </form>
          )}
          <form action={signOut}>
            <button className="button secondary" type="submit">
              Sair
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
