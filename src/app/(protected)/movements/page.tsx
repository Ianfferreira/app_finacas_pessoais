import Link from "next/link";

import { setTransactionOwnership } from "@/app/(protected)/review/actions";
import type { EconomicNature } from "@/domain/metrics";
import {
  MovementsWorkspace,
  type CardPaymentAllocation,
  type CardStatement,
  type MovementRow,
  type ReconciliationCandidate,
} from "@/features/movements/movements-workspace";
import { TerraPage } from "@/features/ui/terra-page";
import { createClient } from "@/lib/supabase/server";

import {
  createTransactionLink,
  dismissReconciliationCandidate,
  recordCardStatementPaymentAllocation,
  removeCardStatementPaymentAllocation,
  setTransactionNature,
} from "./actions";

function fieldFromRelation(relation: unknown, field: string): string | null {
  const item = Array.isArray(relation) ? relation[0] : relation;
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const value = (item as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function allocationRows(relation: unknown): MovementRow["allocations"] {
  if (!Array.isArray(relation)) return [];
  return relation.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const allocation = item as Record<string, unknown>;
    if (
      (allocation.owner_type !== "self" &&
        allocation.owner_type !== "third_party") ||
      typeof allocation.amount !== "number" ||
      (allocation.percentage !== null &&
        typeof allocation.percentage !== "number") ||
      (allocation.person_id !== null &&
        typeof allocation.person_id !== "string")
    ) {
      return [];
    }
    return [
      {
        ownerType: allocation.owner_type,
        ...(typeof allocation.person_id === "string"
          ? { personId: allocation.person_id }
          : {}),
        amount: allocation.amount,
        percentage: allocation.percentage,
      },
    ];
  });
}

function evidenceFields(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const fields = (value as Record<string, unknown>).matched_fields;
  return Array.isArray(fields)
    ? fields.filter((field): field is string => typeof field === "string")
    : [];
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    error?: string;
    month?: string;
    success?: string;
  }>;
}) {
  const { success, error, month, category } = await searchParams;
  const supabase = await createClient();
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")
    ? `${month}-01`
    : null;
  const selectedCategory =
    typeof category === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      category,
    )
      ? category
      : null;
  let movementsQuery = supabase
    .from("transactions")
    .select(
      "id, occurred_on, description_raw, amount, direction, nature, competence_month, nature_source, ownership_source, categories(name), accounts(name), cards(name), imports(original_filename, parser_name, parser_version), allocations(owner_type, person_id, amount, percentage)",
    )
    .order("occurred_on", { ascending: false })
    .limit(100);
  if (selectedMonth)
    movementsQuery = movementsQuery.eq("competence_month", selectedMonth);
  if (selectedCategory)
    movementsQuery = movementsQuery.eq("category_id", selectedCategory);
  const [
    { data },
    { data: people },
    { data: candidates },
    { data: statements },
    { data: paymentAllocations },
    { data: cards },
  ] = await Promise.all([
    movementsQuery,
    supabase
      .from("people")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("reconciliation_candidates")
      .select(
        "id, from_transaction_id, to_transaction_id, link_type, amount, evidence",
      )
      .eq("status", "suggested")
      .order("created_at", { ascending: true }),
    supabase
      .from("card_statements")
      .select("id, card_id, cycle_end, due_on, total_due")
      .order("cycle_end", { ascending: false }),
    supabase
      .from("card_statement_payment_allocations")
      .select("id, payment_transaction_id, card_statement_id, amount"),
    supabase.from("cards").select("id, name"),
  ]);
  const rows: MovementRow[] = (data ?? []).map((row) => ({
    id: row.id,
    occurredOn: row.occurred_on,
    description: row.description_raw,
    amount: row.amount,
    direction: row.direction,
    nature: row.nature as EconomicNature,
    category: fieldFromRelation(row.categories, "name"),
    competenceMonth: row.competence_month,
    accountOrCard:
      fieldFromRelation(row.cards, "name") ??
      fieldFromRelation(row.accounts, "name"),
    sourceFile: fieldFromRelation(row.imports, "original_filename"),
    parser:
      [
        fieldFromRelation(row.imports, "parser_name"),
        fieldFromRelation(row.imports, "parser_version"),
      ]
        .filter(Boolean)
        .join(" ") || null,
    natureSource: row.nature_source,
    ownershipSource: row.ownership_source,
    allocations: allocationRows(row.allocations),
  }));
  const cardNames = new Map((cards ?? []).map((card) => [card.id, card.name]));
  const allocatedByStatement = new Map<string, number>();
  for (const allocation of paymentAllocations ?? []) {
    allocatedByStatement.set(
      allocation.card_statement_id,
      (allocatedByStatement.get(allocation.card_statement_id) ?? 0) +
        allocation.amount,
    );
  }
  const cardStatements: CardStatement[] = (statements ?? []).map(
    (statement) => ({
      id: statement.id,
      cardName: cardNames.get(statement.card_id) ?? null,
      cycleEnd: statement.cycle_end,
      dueOn: statement.due_on,
      totalDue: statement.total_due,
      allocatedAmount: allocatedByStatement.get(statement.id) ?? 0,
    }),
  );
  const cardPaymentAllocations: CardPaymentAllocation[] = (
    paymentAllocations ?? []
  ).map((allocation) => ({
    id: allocation.id,
    paymentTransactionId: allocation.payment_transaction_id,
    statementId: allocation.card_statement_id,
    amount: allocation.amount,
  }));
  const reconciliationCandidates: ReconciliationCandidate[] = (
    candidates ?? []
  ).flatMap((candidate) => {
    if (
      candidate.link_type !== "own_transfer_pair" &&
      candidate.link_type !== "reversal_of"
    ) {
      return [];
    }
    return [
      {
        id: candidate.id,
        fromTransactionId: candidate.from_transaction_id,
        toTransactionId: candidate.to_transaction_id,
        linkType: candidate.link_type,
        amount: candidate.amount,
        evidenceFields: evidenceFields(candidate.evidence),
      },
    ];
  });

  return (
    <TerraPage current="/movements">
      <section className="card terra-movements-page">
        <Link className="back-link" href="/imports">
          ← Importações
        </Link>
        <p className="eyebrow">Movimentações</p>
        <h1>Entenda cada registro</h1>
        <p className="lede">
          Consulte a origem preservada, ajuste a interpretação quando necessário
          e defina a titularidade de despesas compartilhadas.
        </p>
        <div className="terra-movements-actions">
          <Link className="button secondary" href="/review">
            Ver pendências de revisão
          </Link>
          <span>
            Abra os detalhes de um gasto para informar “100% minha”, outra
            pessoa ou um rateio.
          </span>
        </div>
        {selectedMonth || selectedCategory ? (
          <p className="notice review-notice">
            Filtro ativo:{" "}
            {selectedMonth ? `competência ${selectedMonth.slice(0, 7)}` : ""}
            {selectedMonth && selectedCategory ? " · " : ""}
            {selectedCategory ? "categoria selecionada" : ""}.{" "}
            <Link href="/movements">Limpar filtros</Link>
          </p>
        ) : null}
        {success ? (
          <p className="notice success" role="status">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {!rows.length ? (
          <section className="terra-empty-flow">
            <h2>Ainda não há movimentações importadas</h2>
            <p>
              Importe um extrato ou fatura para começar a revisar seus
              registros.
            </p>
            <Link className="button primary" href="/imports">
              Importar dados
            </Link>
          </section>
        ) : (
          <MovementsWorkspace
            actions={{
              setNature: setTransactionNature,
              setOwnership: setTransactionOwnership,
              createLink: createTransactionLink,
              dismissCandidate: dismissReconciliationCandidate,
              allocateCardPayment: recordCardStatementPaymentAllocation,
              removeCardPaymentAllocation: removeCardStatementPaymentAllocation,
            }}
            cardPaymentAllocations={cardPaymentAllocations}
            cardStatements={cardStatements}
            people={people ?? []}
            reconciliationCandidates={reconciliationCandidates}
            rows={rows}
          />
        )}
      </section>
    </TerraPage>
  );
}
