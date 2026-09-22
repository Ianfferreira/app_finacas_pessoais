import {
  brazilianMoneyToCents,
  firstMonthDay,
  normalizeDescription,
  parseInstallment,
  type CardStatementParseResult,
  type ParsedCardStatementTransaction,
} from "./card-statement";

const CARD_PATTERN = /\(Cartão\s+(\d{4})\)/i;
const DUE_PATTERN = /VENCIMENTO\s*\n\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const TRANSACTION_PATTERN =
  /^(\d{2})\/(\d{2})\s+(.+?)\s+([\d.]+,\d{2})([DC])$/i;

export function parseCaixaCardStatementPdfText(
  text: string,
): CardStatementParseResult {
  if (!/cartões\s+CAIXA/i.test(text) || !/COMPRAS\s+PARCELADAS/i.test(text))
    return {
      success: false,
      message: "Este PDF não corresponde à fatura Caixa suportada.",
    };
  const due = DUE_PATTERN.exec(text);
  if (!due)
    return {
      success: false,
      message: "Não foi possível ler o vencimento da fatura Caixa.",
    };
  const dueOn = `${due[3]}-${due[2]}-${due[1]}`;
  let cardLastFour: string | null = null;
  const transactions: ParsedCardStatementTransaction[] = [];
  for (const [index, original] of text.split(/\r?\n/).entries()) {
    const line = original.trim();
    const card = CARD_PATTERN.exec(line);
    if (card) {
      cardLastFour = card[1];
      continue;
    }
    const match = TRANSACTION_PATTERN.exec(line);
    if (!match || !cardLastFour || /^(total|data\s+descrição)/i.test(line))
      continue;
    const occurredOn = `${due[3]}-${match[2]}-${match[1]}`;
    const descriptionRaw = normalizeDescription(match[3]);
    const isCredit = match[5].toUpperCase() === "C";
    transactions.push({
      sourceRowNumber: index + 1,
      cardLastFour,
      occurredOn,
      purchaseDate: occurredOn,
      competenceMonth: "",
      descriptionRaw,
      amount: brazilianMoneyToCents(match[4]),
      kind: isCredit
        ? /pagamento|obrigado/i.test(descriptionRaw)
          ? "payment"
          : "reversal"
        : "purchase",
      installment: parseInstallment(descriptionRaw),
      rawPayload: { line, cardLastFour, creditDebit: match[5] },
    });
  }
  if (!transactions.length)
    return {
      success: false,
      message: "A fatura Caixa não contém lançamentos legíveis.",
    };
  const cycleEnd = transactions
    .map(({ occurredOn }) => occurredOn)
    .sort()
    .at(-1) as string;
  const competenceMonth = firstMonthDay(cycleEnd);
  transactions.forEach(
    (transaction) => (transaction.competenceMonth = competenceMonth),
  );
  return {
    success: true,
    statement: {
      institutionCode: "CAIXA",
      parserName: "caixa-card-statement-pdf",
      parserVersion: "1",
      cycleStart: null,
      cycleEnd,
      dueOn,
      transactions,
    },
  };
}
