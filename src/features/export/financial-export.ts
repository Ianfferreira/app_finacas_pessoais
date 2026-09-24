import { strToU8, zipSync } from "fflate";

export const EXPORT_SCHEMA_VERSION = "1.0";
export const EXPORT_PAGE_SIZE = 500;

export const EXPORT_DATASET_NAMES = [
  "profiles",
  "institutions",
  "accounts",
  "cards",
  "imports",
  "raw_records",
  "transactions",
  "transaction_links",
  "categories",
  "subcategories",
  "merchants",
  "merchant_aliases",
  "people",
  "person_aliases",
  "allocations",
  "third_party_entries",
  "settlements",
  "settlement_allocations",
  "card_statements",
  "card_statement_payment_allocations",
  "installment_groups",
  "installments",
  "installment_allocations",
  "classification_rules",
  "classification_rule_applications",
  "review_items",
  "possible_duplicate_candidates",
  "reconciliation_candidates",
  "monthly_closings",
  "monthly_closing_versions",
  "audit_events",
] as const;

export type ExportDatasetName = (typeof EXPORT_DATASET_NAMES)[number];
export type ExportRow = Readonly<Record<string, unknown>>;
export type ExportDatasets = Record<ExportDatasetName, readonly ExportRow[]>;

export interface ExportManifest {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  datasets: ReadonlyArray<{
    name: ExportDatasetName;
    path: string;
    count: number;
  }>;
  counts: Record<ExportDatasetName, number>;
}

export interface FinancialExportPayload {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  manifest: ExportManifest;
  datasets: ExportDatasets;
  notice: string;
}

export interface PageResult<T> {
  data: readonly T[] | null;
  error: { message: string } | null;
}

export class ExportQueryError extends Error {
  constructor(
    public readonly dataset: string,
    cause: { message: string },
  ) {
    super(`Unable to export ${dataset}: ${cause.message}`);
    this.name = "ExportQueryError";
  }
}

/**
 * Reads pages in stable, caller-defined order. The function is independent of
 * Supabase so its paging behaviour remains testable without a database.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  dataset: string,
  pageSize = EXPORT_PAGE_SIZE,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new ExportQueryError(dataset, result.error);

    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function isForbiddenKey(key: string): boolean {
  return [
    "cookie",
    "credential",
    "password",
    "secret",
    "service_role",
    "servicerole",
    "private_key",
    "privatekey",
    "api_key",
    "apikey",
    "signed_url",
    "signedurl",
    "storage_path",
    "storagepath",
  ].includes(key.toLowerCase());
}

/** Removes capability/credential fields even if an upstream schema gains one. */
export function sanitizeForExport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForExport);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isForbiddenKey(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sanitizeForExport(nested)]),
    );
  }
  return value;
}

export function sanitizeDataset(
  rows: readonly ExportRow[],
): readonly ExportRow[] {
  return rows.map((row) => sanitizeForExport(row) as ExportRow);
}

function isCsvFormula(value: string): boolean {
  return /^[=+@\-\t\r]/.test(value);
}

export function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  const protectedText =
    typeof value === "string" && isCsvFormula(text) ? `'${text}` : text;
  return /[",\n\r]/.test(protectedText)
    ? `"${protectedText.replace(/"/g, '""')}"`
    : protectedText;
}

export function transactionsToCsv(
  transactions: ReadonlyArray<Record<string, unknown>>,
): string {
  const header = [
    "id",
    "occurred_on",
    "competence_month",
    "description_raw",
    "amount",
    "direction",
    "nature",
    "category_id",
    "is_void",
  ];
  const rows = transactions.map((transaction) =>
    header.map((key) => csvEscape(transaction[key])).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function createManifest(
  datasets: ExportDatasets,
  exportedAt: string,
): ExportManifest {
  const counts = Object.fromEntries(
    EXPORT_DATASET_NAMES.map((name) => [name, datasets[name].length]),
  ) as Record<ExportDatasetName, number>;

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    counts,
    datasets: EXPORT_DATASET_NAMES.map((name) => ({
      name,
      path: `dados/${name}.json`,
      count: counts[name],
    })),
  };
}

export function createFinancialExportPayload(
  datasets: ExportDatasets,
  exportedAt = new Date().toISOString(),
): FinancialExportPayload {
  const sanitizedDatasets = Object.fromEntries(
    EXPORT_DATASET_NAMES.map((name) => [name, sanitizeDataset(datasets[name])]),
  ) as ExportDatasets;

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    manifest: createManifest(sanitizedDatasets, exportedAt),
    datasets: sanitizedDatasets,
    notice:
      "A exportação contém dados estruturados e metadados. Arquivos binários privados, caminhos de Storage, URLs assinadas, cookies e credenciais foram deliberadamente excluídos.",
  };
}

export function serializeExport(payload: FinancialExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function exportReadme(): string {
  return [
    "EXPORTAÇÃO V1 — FINANÇAS PESSOAIS",
    "",
    "Este ZIP contém dados estruturados do usuário para auditoria e restauração conceitual.",
    "Cada conjunto está em dados/<entidade>.json; manifest.json descreve a versão, a data e as contagens.",
    "financas-movimentacoes.csv é uma visão tabular das transações interpretadas.",
    "",
    "Privacidade: PDFs/CSVs originais, binários privados do Storage, caminhos de Storage, URLs assinadas, cookies, credenciais e chaves não fazem parte desta exportação.",
    "Valores monetários são números decimais em BRL ou na moeda indicada pelo próprio registro. Datas usam ISO 8601 (AAAA-MM-DD) e instantes usam ISO 8601 com fuso UTC.",
    "",
    "Restauração conceitual: importe primeiro perfis e cadastros, depois importações/registros brutos, transações e relações, e por fim regras, revisões e fechamentos. Preserve IDs para manter referências entre conjuntos.",
    "Esta exportação não recria arquivos binários removidos ou não incluídos no backup.",
    "",
  ].join("\n");
}

export function createStructuredExportZip(
  payload: FinancialExportPayload,
  csv: string,
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(`${JSON.stringify(payload.manifest, null, 2)}\n`),
    "financas-movimentacoes.csv": strToU8(csv),
    "LEIA-ME.txt": strToU8(exportReadme()),
  };

  for (const name of EXPORT_DATASET_NAMES) {
    files[`dados/${name}.json`] = strToU8(
      `${JSON.stringify(payload.datasets[name], null, 2)}\n`,
    );
  }

  return zipSync(files, { level: 6 });
}
