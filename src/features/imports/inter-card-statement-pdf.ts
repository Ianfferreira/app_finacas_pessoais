import {
  brazilianMoneyToCents,
  firstMonthDay,
  normalizeDescription,
  parseInstallment,
  parseIsoDate,
  parsePortugueseDate,
  type CardStatementParseResult,
  type ParsedCardStatementTransaction,
} from "./card-statement";

const CARD_PATTERN = /^CARTÃO\s+.*?(\d{4})$/i;
const TRANSACTION_PATTERN =
  /^(\d{1,2})\s+de\s+([a-zç]+)\.\s+(\d{4})\s+(.+?)\s+([+-])\s+R\$\s*([\d.]+,\d{2})$/i;

export function parseInterCardStatementPdfText(
  text: string,
): CardStatementParseResult {
  if (
    !/Resumo\s+da\s+fatura/i.test(text) ||
    !/Despesas\s+da\s+fatura/i.test(text)
  ) {
    return {
      success: false,
      message: "Este PDF não corresponde à fatura Inter suportada.",
    };
  }

  const dueOn = parseIsoDate((/\d{2}\/\d{2}\/\d{4}/.exec(text) ?? [])[0] ?? "");
  let currentCardLastFour: string | null = null;
  const transactions: ParsedCardStatementTransaction[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const normalizedLine = line.trim();
    const cardMatch = CARD_PATTERN.exec(normalizedLine);
    if (cardMatch) {
      currentCardLastFour = cardMatch[1];
      continue;
    }
    const match = TRANSACTION_PATTERN.exec(normalizedLine);
    if (!match || !currentCardLastFour) continue;
    const occurredOn = parsePortugueseDate(match[1], match[2], match[3]);
    if (!occurredOn) continue;
    const descriptionRaw = normalizeDescription(
      match[4].replace(/[-+]\s*$/, ""),
    );
    // Credits in the Inter layout share the "+" signal with statement
    // payments. Keep the source signal, but recognize the provider's generic
    // reversal labels first so a reversal does not become a card payment.
    const isReversal = /(?:^|\s)(?:estorno|est\.?\s+ass)\b/i.test(
      descriptionRaw,
    );
    const isPayment =
      !isReversal && (/pagamento/i.test(descriptionRaw) || match[5] === "+");
    transactions.push({
      sourceRowNumber: index + 1,
      cardLastFour: currentCardLastFour,
      occurredOn,
      purchaseDate: occurredOn,
      competenceMonth: "",
      descriptionRaw,
      amount: brazilianMoneyToCents(match[6]),
      kind: isReversal ? "reversal" : isPayment ? "payment" : "purchase",
      installment: parseInstallment(descriptionRaw),
      rawPayload: { line: normalizedLine, cardLastFour: currentCardLastFour },
    });
  }
  if (!transactions.length) {
    return {
      success: false,
      message: "A fatura Inter não contém lançamentos legíveis.",
    };
  }

  // The Inter layout does not state the cycle period. The most recent purchase
  // date is the only source-backed cycle marker, so use it rather than inventing
  // a due-date-based competence.
  const cycleEnd = [...transactions]
    .map(({ occurredOn }) => occurredOn)
    .sort()
    .at(-1) as string;
  const competenceMonth = firstMonthDay(cycleEnd);
  for (const transaction of transactions)
    transaction.competenceMonth = competenceMonth;

  return {
    success: true,
    statement: {
      institutionCode: "INTER",
      parserName: "inter-card-statement-pdf",
      parserVersion: "2",
      cycleStart: null,
      cycleEnd,
      dueOn,
      transactions,
    },
  };
}
