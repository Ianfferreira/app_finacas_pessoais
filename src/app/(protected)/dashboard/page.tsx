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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/dashboard");

  const month = currentMonth();
  const [{ data: profile }, { data: transactions }, review, { data: closing }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("transactions")
        .select("amount, direction, nature, category_id, categories(name)")
        .eq("competence_month", month)
        .eq("is_void", false),
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

  const income = (transactions ?? [])
    .filter(
      (row) =>
        row.direction === "inflow" &&
        (row.nature === "income" || row.nature === "investment_income"),
    )
    .reduce((sum, row) => sum + row.amount, 0);
  const expenses = (transactions ?? [])
    .filter((row) => row.direction === "outflow" && row.nature === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  const categories = new Map<string, number>();
  for (const row of transactions ?? []) {
    if (row.direction !== "outflow" || row.nature !== "expense") continue;
    const category = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;
    const name = category?.name ?? "Sem categoria";
    categories.set(name, (categories.get(name) ?? 0) + row.amount);
  }
  const insights = [...categories.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);

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
            insights.map(([name, amount]) => (
              <li key={name}>
                {name}: {formatCurrency.format(amount)}
                {expenses
                  ? ` (${((amount / expenses) * 100).toFixed(1)}%)`
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
              <button className="button secondary" type="submit">
                Fechar mês atual
              </button>
            </form>
          ) : (
            <form action={reopenCurrentMonth}>
              <button className="button secondary" type="submit">
                Reabrir mês atual
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
