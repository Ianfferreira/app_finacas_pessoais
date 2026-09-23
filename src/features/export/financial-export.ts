import { strToU8, zipSync } from "fflate";

export function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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

export function createStructuredExportZip(
  payload: object,
  csv: string,
): Uint8Array {
  return zipSync({
    "financas-export.json": strToU8(JSON.stringify(payload, null, 2)),
    "financas-movimentacoes.csv": strToU8(csv),
    "LEIA-ME.txt": strToU8(
      "Este arquivo contém dados estruturados exportados manualmente. PDFs privados, registros brutos e credenciais não foram incluídos.",
    ),
  });
}
