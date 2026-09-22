import { moneyToDecimal } from "../../domain/money";
import {
  firstMonthDay,
  normalizeDescription,
  parsePortugueseDate,
} from "./card-statement";
import { moneyFromDecimal } from "../../domain/money";

export type ParsedNubankStatementPdfRow = {
  rowNumber: number;
  occurredOn: string;
  signedAmountCents: bigint;
  externalId: string;
  descriptionRaw: string;
};

export type NubankStatementPdfParseResult =
  | {
      success: true;
      rows: ParsedNubankStatementPdfRow[];
      parserVersion: string;
    }
  | { success: false; message: string };

const DATE_LINE =
  /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+(.+?)\s+R\$\s*([\d.]+,\d{2})$/i;

/** Explicit adapter for selectable-text Nubank bank-statement PDFs. */
export function parseNubankStatementPdfText(
  text: string,
): NubankStatementPdfParseResult {
  if (!/\bnubank\b/i.test(text) || !/\bextrato\b/i.test(text)) {
    return {
      success: false,
      message: "Este não parece ser um extrato Nubank em PDF.",
    };
  }
  const period =
    /(?:período|periodo)\s*(?:do\s*)?(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/i.exec(
      text,
    );
  if (!period) {
    return {
      success: false,
      message: "Não foi possível identificar o ano do extrato Nubank.",
    };
  }
  const year = period[3];
  let section: "inflow" | "outflow" | null = null;
  const rows: ParsedNubankStatementPdfRow[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (/^(entradas?|recebimentos?)$/i.test(line)) {
      section = "inflow";
      continue;
    }
    if (/^(saídas?|saidas?|pagamentos?)$/i.test(line)) {
      section = "outflow";
      continue;
    }
    const match = DATE_LINE.exec(line);
    if (!match || !section) continue;
    const occurredOn = parsePortugueseDate(match[1], match[2], year);
    if (!occurredOn) continue;
    const amount = moneyFromDecimal(
      match[4].replace(/\./g, "").replace(",", "."),
    );
    const descriptionRaw = normalizeDescription(match[3]);
    rows.push({
      rowNumber: index + 1,
      occurredOn,
      signedAmountCents: section === "outflow" ? -amount : amount,
      externalId: `nubank-pdf:${occurredOn}:${moneyToDecimal(amount)}:${descriptionRaw.toLocaleLowerCase("pt-BR")}`,
      descriptionRaw,
    });
  }
  if (!rows.length) {
    return {
      success: false,
      message:
        "Não encontramos lançamentos no layout reconhecido do extrato Nubank.",
    };
  }
  return { success: true, rows, parserVersion: "1" };
}

export function nubankPdfRowToRpc(row: ParsedNubankStatementPdfRow) {
  return {
    rowNumber: row.rowNumber,
    occurredOn: row.occurredOn,
    signedAmount: moneyToDecimal(row.signedAmountCents),
    externalId: row.externalId,
    descriptionRaw: row.descriptionRaw,
    competenceMonth: firstMonthDay(row.occurredOn),
  };
}
