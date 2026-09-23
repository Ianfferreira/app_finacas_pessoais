import Link from "next/link";
import { redirect } from "next/navigation";

import {
  buildCategoryBreakdown,
  movementsDrilldownHref,
} from "@/features/dashboard/category-breakdown";
import {
  type DashboardMetric,
  FinanceDashboard,
} from "@/features/dashboard/terra-dashboard";
import { createClient } from "@/lib/supabase/server";

import { closeCurrentMonth, reopenCurrentMonth, signOut } from "./actions";

const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatMonth = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function currentMonth() {
  const today = new Date();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthFromSearchParam(value: string | undefined): string {
  if (!value || !MONTH.test(value)) return currentMonth();
  return `${value}-01`;
}

function shiftMonth(month: string, offset: number): string {
  const [year, value] = month.slice(0, 7).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function closingLabel(status: string | null | undefined): string {
  if (status === "closed") return "Fechado";
  if (status === "closed_with_pending") return "Fechado com pendências";
  return "Em andamento";
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
  const result = income - expenses;
  const consumed =
    income > 0
      ? `${((expenses / income) * 100).toFixed(1).replace(".", ",")}%`
      : "Não aplicável";
  const categoryBreakdown = buildCategoryBreakdown(
    categoryMetrics ?? [],
    categories ?? [],
  );
  const isPreliminary = closing?.status !== "closed";
  const currentClosingLabel = closingLabel(closing?.status);
  const pendingCount = review.count ?? 0;
  const monthLabel = formatMonth.format(new Date(`${month}T00:00:00Z`));
  const metricDetail = isPreliminary
    ? "Valor sujeito às pendências do mês."
    : "Valor consolidado no fechamento.";

  const dashboardMetrics: DashboardMetric[] = [
    {
      label: "Receitas",
      value: formatCurrency.format(income),
      detail: metricDetail,
      href: movementsDrilldownHref(month),
      actionLabel: "Ver composição",
    },
    {
      label: "Gastos pessoais",
      value: formatCurrency.format(expenses),
      detail: metricDetail,
      href: movementsDrilldownHref(month),
      actionLabel: "Ver movimentações",
    },
    {
      label: "Resultado",
      value: formatCurrency.format(result),
      detail: "Receitas menos gastos pessoais.",
      href: movementsDrilldownHref(month),
      actionLabel: "Ver cálculo",
      featured: true,
    },
    {
      label: "Renda consumida",
      value: consumed,
      detail:
        income > 0
          ? "Gastos pessoais sobre receitas."
          : "Exibido somente com receitas positivas.",
      href: movementsDrilldownHref(month),
      actionLabel: "Entender indicador",
    },
  ];

  const statusMessage = error ? (
    <p className="notice error" role="alert">
      {error}
    </p>
  ) : success ? (
    <p className="notice success" role="status">
      {success}
    </p>
  ) : null;

  const footerActions = (
    <div className="terra-footer-actions">
      <Link className="button secondary" href="/movements">
        Movimentações
      </Link>
      <Link className="button secondary" href="/review">
        Revisão
      </Link>
      <Link className="button secondary" href="/history">
        Histórico
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
  );

  return (
    <FinanceDashboard
      categoryBreakdown={categoryBreakdown}
      closingLabel={currentClosingLabel}
      footerActions={footerActions}
      isPreliminary={isPreliminary}
      metrics={dashboardMetrics}
      month={month}
      monthLabel={monthLabel}
      navigation={{
        previous: `/dashboard?month=${shiftMonth(month, -1)}`,
        next: `/dashboard?month=${shiftMonth(month, 1)}`,
      }}
      pendingCount={pendingCount}
      personalExpenses={expenses}
      personName={profile?.display_name}
      statusMessage={statusMessage}
    />
  );
}
