import {
  brazilianMoneyToCents,
  firstMonthDay,
  normalizeDescription,
  parseInstallment,
  parsePortugueseDate,
  type CardStatementParseResult,
  type ParsedCardStatementTransaction,
} from "./card-statement";

const PERIOD_PATTERN =
  /PER[IÍ]ODO\s+VIGENTE:\s*(\d{2})\s+([A-Z]{3})\s+A\s+(\d{2})\s+([A-Z]{3})/i;
const DUE_PATTERN = /DATA\s+DE\s+VENCIMENTO:\s*(\d{2})\s+([A-Z]{3})\s+(\d{4})/i;
const TRANSACTION_PATTERN =
  /^(\d{2})\s+([A-Z]{3})\s+(?:••••\s+(\d{4})\s+)?(.+?)\s+([−-]?R\$\s*[\d.]+,\d{2})$/i;

export function parseNubankCardStatementPdfText(
  text: string,
): CardStatementParseResult {
  const dueMatch = DUE_PATTERN.exec(text);
  const periodMatch = PERIOD_PATTERN.exec(text);
  if (!dueMatch || !periodMatch || !/TRANSAÇÕES\s+DE/i.test(text)) {
    return {
      success: false,
      message: "Este PDF não corresponde à fatura Nubank suportada.",
    };
  }

  const dueOn = parsePortugueseDate(dueMatch[1], dueMatch[2], dueMatch[3]);
  const cycleStart = parsePortugueseDate(
    periodMatch[1],
    periodMatch[2],
    dueMatch[3],
  );
  const cycleEnd = parsePortugueseDate(
    periodMatch[3],
    periodMatch[4],
    dueMatch[3],
  );
  if (!dueOn || !cycleStart || !cycleEnd) {
    return {
      success: false,
      message: "Não foi possível ler o período da fatura Nubank.",
    };
  }

  const transactions: ParsedCardStatementTransaction[] = [];
  const lines = text.split(/\r?\n/);
  let inTransactions = false;
  for (const [index, line] of lines.entries()) {
    if (/^TRANSAÇÕES\s+DE/i.test(line.trim())) {
      inTransactions = true;
      continue;
    }
    if (!inTransactions) continue;

    const match = TRANSACTION_PATTERN.exec(line.trim());
    if (!match) continue;
    const occurredOn = parsePortugueseDate(match[1], match[2], dueMatch[3]);
    if (!occurredOn) continue;
    const descriptionRaw = normalizeDescription(match[4]);
    const kind = /pagamento\s+em/i.test(descriptionRaw)
      ? "payment"
      : /estorno/i.test(descriptionRaw)
        ? "reversal"
        : "purchase";
    transactions.push({
      sourceRowNumber: index + 1,
      cardLastFour: match[3] ?? null,
      occurredOn,
      purchaseDate: occurredOn,
      competenceMonth: firstMonthDay(cycleEnd),
      descriptionRaw,
      amount: brazilianMoneyToCents(match[5]),
      kind,
      installment: parseInstallment(descriptionRaw),
      rawPayload: { line: line.trim() },
    });
  }

  if (!transactions.length) {
    return {
      success: false,
      message: "A fatura Nubank não contém lançamentos legíveis.",
    };
  }
  return {
    success: true,
    statement: {
      institutionCode: "NUBANK",
      parserName: "nubank-card-statement-pdf",
      parserVersion: "1",
      cycleStart,
      cycleEnd,
      dueOn,
      transactions,
    },
  };
}
