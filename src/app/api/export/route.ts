import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createFinancialExportPayload,
  createStructuredExportZip,
  EXPORT_DATASET_NAMES,
  ExportQueryError,
  fetchAllPages,
  serializeExport,
  transactionsToCsv,
  type ExportDatasetName,
  type ExportDatasets,
  type ExportRow,
} from "@/features/export/financial-export";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

export const dynamic = "force-dynamic";

type ExportTable = keyof Database["public"]["Tables"];

interface DatasetConfig {
  name: ExportDatasetName;
  table: ExportTable;
  orderBy: string;
}

const DATASET_CONFIG: readonly DatasetConfig[] = [
  { name: "profiles", table: "profiles", orderBy: "user_id" },
  { name: "institutions", table: "institutions", orderBy: "id" },
  { name: "accounts", table: "accounts", orderBy: "id" },
  { name: "cards", table: "cards", orderBy: "id" },
  { name: "imports", table: "imports", orderBy: "id" },
  { name: "raw_records", table: "raw_records", orderBy: "id" },
  { name: "transactions", table: "transactions", orderBy: "id" },
  { name: "transaction_links", table: "transaction_links", orderBy: "id" },
  { name: "categories", table: "categories", orderBy: "id" },
  { name: "subcategories", table: "subcategories", orderBy: "id" },
  { name: "merchants", table: "merchants", orderBy: "id" },
  { name: "merchant_aliases", table: "merchant_aliases", orderBy: "id" },
  { name: "people", table: "people", orderBy: "id" },
  { name: "person_aliases", table: "person_aliases", orderBy: "id" },
  { name: "allocations", table: "allocations", orderBy: "id" },
  { name: "third_party_entries", table: "third_party_entries", orderBy: "id" },
  { name: "settlements", table: "settlements", orderBy: "id" },
  {
    name: "settlement_allocations",
    table: "settlement_allocations",
    orderBy: "id",
  },
  { name: "card_statements", table: "card_statements", orderBy: "id" },
  {
    name: "card_statement_payment_allocations",
    table: "card_statement_payment_allocations",
    orderBy: "id",
  },
  { name: "installment_groups", table: "installment_groups", orderBy: "id" },
  { name: "installments", table: "installments", orderBy: "id" },
  {
    name: "installment_allocations",
    table: "installment_allocations",
    orderBy: "id",
  },
  {
    name: "classification_rules",
    table: "classification_rules",
    orderBy: "id",
  },
  {
    name: "classification_rule_applications",
    table: "classification_rule_applications",
    orderBy: "id",
  },
  { name: "review_items", table: "review_items", orderBy: "id" },
  {
    name: "possible_duplicate_candidates",
    table: "possible_duplicate_candidates",
    orderBy: "id",
  },
  {
    name: "reconciliation_candidates",
    table: "reconciliation_candidates",
    orderBy: "id",
  },
  { name: "monthly_closings", table: "monthly_closings", orderBy: "id" },
  {
    name: "monthly_closing_versions",
    table: "monthly_closing_versions",
    orderBy: "id",
  },
  { name: "audit_events", table: "audit_events", orderBy: "id" },
];

function asExportRows(rows: unknown): readonly ExportRow[] | null {
  if (rows === null) return null;
  return rows as readonly ExportRow[];
}

async function readDataset(
  supabase: SupabaseClient<Database>,
  config: DatasetConfig,
): Promise<readonly ExportRow[]> {
  return fetchAllPages(async (from, to) => {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .order(config.orderBy, { ascending: true })
      .range(from, to);

    return { data: asExportRows(data), error };
  }, config.name);
}

function institutionIdsReferencedBy(datasets: ExportDatasets): Set<string> {
  const ids = new Set<string>();
  for (const datasetName of ["accounts", "cards", "imports"] as const) {
    for (const row of datasets[datasetName]) {
      const value =
        datasetName === "imports"
          ? row.detected_institution_id
          : row.institution_id;
      if (typeof value === "string") ids.add(value);
    }
  }
  return ids;
}

async function collectDatasets(
  supabase: SupabaseClient<Database>,
): Promise<ExportDatasets> {
  const rows = await Promise.all(
    DATASET_CONFIG.map(
      async (config) =>
        [config.name, await readDataset(supabase, config)] as const,
    ),
  );
  const datasets = Object.fromEntries(rows) as ExportDatasets;
  const institutionIds = institutionIdsReferencedBy(datasets);

  return {
    ...datasets,
    institutions: datasets.institutions.filter(
      (institution) =>
        typeof institution.id === "string" &&
        institutionIds.has(institution.id),
    ),
  };
}

function exportFailureResponse(error: unknown): Response {
  const dataset = error instanceof ExportQueryError ? error.dataset : undefined;
  console.error("financial export failed", { dataset });
  const detail = dataset ? ` Conjunto afetado: ${dataset}.` : "";
  return Response.json(
    {
      error: `Não foi possível concluir a exportação.${detail} Tente novamente; se persistir, entre em contato com o suporte.`,
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv" && format !== "zip") {
    return Response.json(
      { error: "Formato inválido. Use json, csv ou zip." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return new Response("Não autenticado.", { status: 401 });
  }

  try {
    const datasets = await collectDatasets(supabase);
    const payload = createFinancialExportPayload(datasets);
    const csv = transactionsToCsv(payload.datasets.transactions);

    if (format === "csv") {
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="financas-movimentacoes.csv"',
        },
      });
    }

    if (format === "zip") {
      const archive = createStructuredExportZip(payload, csv);
      return new Response(archive.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="financas-export.zip"',
        },
      });
    }

    return new Response(serializeExport(payload), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="financas-export.json"',
      },
    });
  } catch (error) {
    return exportFailureResponse(error);
  }
}

export const exportedDatasetNames = EXPORT_DATASET_NAMES;
