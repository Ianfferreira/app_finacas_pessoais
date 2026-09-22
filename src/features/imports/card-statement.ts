import { moneyFromDecimal, type Money } from "../../domain/money";

export type CardStatementTransactionKind = "purchase" | "payment" | "reversal";

export type ParsedCardStatementTransaction = {
  sourceRowNumber: number;
  cardLastFour: string | null;
  occurredOn: string;
  purchaseDate: string | null;
  competenceMonth: string;
  descriptionRaw: string;
  amount: Money;
  kind: CardStatementTransactionKind;
  installment: { number: number; total: number } | null;
  rawPayload: Record<string, string | number | null>;
};

export type ParsedCardStatement = {
  institutionCode: "NUBANK" | "CAIXA" | "INTER" | "RICO_XP";
  parserName: string;
  parserVersion: string;
  cycleStart: string | null;
  cycleEnd: string | null;
  dueOn: string | null;
  transactions: ParsedCardStatementTransaction[];
};

export type ParseSuccess = { success: true; statement: ParsedCardStatement };
export type ParseFailure = { success: false; message: string };
export type CardStatementParseResult = ParseSuccess | ParseFailure;

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEV: "02",
  MAR: "03",
  ABR: "04",
  MAI: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SET: "09",
  OUT: "10",
  NOV: "11",
  DEZ: "12",
};

export function brazilianMoneyToCents(value: string): Money {
  const normalized = value
    .replace(/[−-]/g, "")
    .replace(/R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  return moneyFromDecimal(normalized);
}

export function firstMonthDay(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function parseIsoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function parsePortugueseDate(
  day: string,
  month: string,
  year: string,
): string | null {
  const monthNumber = MONTHS[month.slice(0, 3).toUpperCase()];
  return monthNumber ? `${year}-${monthNumber}-${day.padStart(2, "0")}` : null;
}

export function parseInstallment(value: string): {
  number: number;
  total: number;
} | null {
  const match =
    /parcela\s*(\d{1,3})\s*(?:\/|de)\s*(\d{1,3})/i.exec(value) ??
    /\b(\d{1,3})\s+de\s+(\d{1,3})\b/i.exec(value);
  if (!match) return null;
  const number = Number(match[1]);
  const total = Number(match[2]);
  return number > 0 && total >= number ? { number, total } : null;
}

export function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
