import { createHash } from "node:crypto";

export const NUBANK_STATEMENT_CSV_HEADERS = [
  "Data",
  "Valor",
  "Identificador",
  "Descrição",
] as const;

export type NubankStatementRow = {
  occurredOn: string;
  signedAmountCents: bigint;
  externalId: string;
  descriptionRaw: string;
};

export type NubankStatementParseResult =
  | { success: true; rows: NubankStatementRow[] }
  | { success: false; message: string };

function parseCsvLine(line: string): string[] | null {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }

  if (quoted) return null;
  values.push(value);
  return values;
}

function parseDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseSignedCents(value: string): bigint | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents =
    BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

export function parseNubankStatementCsv(
  content: string,
): NubankStatementParseResult {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  const header = lines.shift();
  if (!header || header !== NUBANK_STATEMENT_CSV_HEADERS.join(",")) {
    return {
      success: false,
      message: "O arquivo não é um extrato CSV Nubank reconhecido.",
    };
  }

  const rows: NubankStatementRow[] = [];
  for (const [index, line] of lines.entries()) {
    const columns = parseCsvLine(line);
    const occurredOn = columns ? parseDate(columns[0]) : null;
    const signedCents = columns ? parseSignedCents(columns[1]) : null;
    if (
      !columns ||
      columns.length !== 4 ||
      !occurredOn ||
      signedCents === null ||
      !columns[2] ||
      !columns[3]
    ) {
      return {
        success: false,
        message: `Linha ${index + 2}: dados inválidos no CSV Nubank.`,
      };
    }
    rows.push({
      occurredOn,
      signedAmountCents: signedCents,
      externalId: columns[2],
      descriptionRaw: columns[3],
    });
  }
  return { success: true, rows };
}

export function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}
