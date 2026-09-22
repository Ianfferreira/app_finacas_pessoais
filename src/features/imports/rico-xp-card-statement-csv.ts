import {
  brazilianMoneyToCents,
  firstMonthDay,
  normalizeDescription,
  parseInstallment,
  parseIsoDate,
  type CardStatementParseResult,
  type ParsedCardStatementTransaction,
} from "./card-statement";

const HEADER = ["Data", "Estabelecimento", "Portador", "Valor", "Parcela"];

function parseRow(line: string): string[] {
  return line.split(";").map((value) => value.trim());
}

function dateFromFilename(filename: string): string | null {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(filename);
  return match ? parseIsoDate(match[1].split("-").reverse().join("/")) : null;
}

export function parseRicoXpCardStatementCsv(
  content: string,
  filename: string,
): CardStatementParseResult {
  const [headerLine, ...lines] = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (
    !headerLine ||
    !HEADER.every((value, index) => parseRow(headerLine)[index] === value)
  ) {
    return {
      success: false,
      message: "Este CSV não corresponde à fatura Rico/XP suportada.",
    };
  }
  const dueOn = dateFromFilename(filename);
  if (!dueOn) {
    return {
      success: false,
      message: "O nome da fatura Rico/XP deve conter uma data AAAA-MM-DD.",
    };
  }
  const dueDate = new Date(`${dueOn}T00:00:00.000Z`);
  dueDate.setUTCMonth(dueDate.getUTCMonth() - 1);
  const competenceMonth = firstMonthDay(dueDate.toISOString().slice(0, 10));
  const transactions: ParsedCardStatementTransaction[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const [dateValue, establishment, holder, amountValue, installmentValue] =
      parseRow(line);
    const occurredOn = parseIsoDate(dateValue);
    if (!occurredOn || !establishment || !amountValue) {
      return {
        success: false,
        message: `A linha ${index + 2} da fatura Rico/XP é inválida.`,
      };
    }
    const descriptionRaw = normalizeDescription(establishment);
    const kind =
      /pagamento/i.test(descriptionRaw) || /^R\$\s*-/i.test(amountValue)
        ? "payment"
        : /estorno/i.test(descriptionRaw)
          ? "reversal"
          : "purchase";
    transactions.push({
      sourceRowNumber: index + 2,
      cardLastFour: null,
      occurredOn,
      purchaseDate: occurredOn,
      competenceMonth,
      descriptionRaw,
      amount: brazilianMoneyToCents(amountValue),
      kind,
      installment: parseInstallment(installmentValue),
      rawPayload: {
        date: dateValue,
        establishment,
        holder: holder || null,
        amount: amountValue,
        installment: installmentValue || null,
      },
    });
  }
  if (!transactions.length) {
    return {
      success: false,
      message: "A fatura Rico/XP não contém lançamentos.",
    };
  }
  return {
    success: true,
    statement: {
      institutionCode: "RICO_XP",
      parserName: "rico-xp-card-statement-csv",
      parserVersion: "1",
      cycleStart: null,
      cycleEnd: dueOn,
      dueOn,
      transactions,
    },
  };
}
