import Link from "next/link";
import { redirect } from "next/navigation";

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
    supabase
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("monthly_closings")
      .select("status, version")
      .eq("month", month)
      .maybeSingle(),
  ]);

  const income = metrics?.income ?? 0;
  const expenses = metrics?.personal_expenses ?? 0;
  const insights = (categoryMetrics ?? []).slice(0, 3);

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
        <h2>Insights factuais</h2>
        <ul>
          {insights.length ? (
            insights.map(
              ({ category_name: name, personal_expenses: amount }) => (
                <li key={name}>
                  {name}: {formatCurrency.format(amount)}
                  {expenses
                    ? ` (${((amount / expenses) * 100).toFixed(1)}%)`
                    : ""}
                </li>
              ),
            )
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
