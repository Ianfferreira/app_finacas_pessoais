import { moneyToDecimal } from "../../domain/money";
import { sha256 } from "./file-hash";

import type { ParsedCardStatement } from "./card-statement";

export type CardStatementRpcRow = {
  sourceRowNumber: number;
  cardLastFour: string | null;
  occurredOn: string;
  purchaseDate: string | null;
  competenceMonth: string;
  descriptionRaw: string;
  amount: string;
  kind: "purchase" | "payment" | "reversal";
  installment: { number: number; total: number } | null;
  sourceGroupKey?: string;
  rawPayload: Record<string, string | number | null>;
};

/**
 * Converts an adapter result into the explicit, JSON-safe RPC contract. The
 * group key identifies the same purchase across successive monthly invoices;
 * it intentionally excludes the current installment number and statement hash.
 */
export function cardStatementRpcPayload(statement: ParsedCardStatement): {
  cardLastFours: Array<string | null>;
  rows: CardStatementRpcRow[];
} {
  const cardLastFours = Array.from(
    new Set(
      statement.transactions.map((transaction) => transaction.cardLastFour),
    ),
  );

  return {
    cardLastFours: cardLastFours.length ? cardLastFours : [null],
    rows: statement.transactions.map((transaction) => ({
      sourceRowNumber: transaction.sourceRowNumber,
      cardLastFour: transaction.cardLastFour,
      occurredOn: transaction.occurredOn,
      purchaseDate: transaction.purchaseDate,
      competenceMonth: transaction.competenceMonth,
      descriptionRaw: transaction.descriptionRaw,
      amount: moneyToDecimal(transaction.amount),
      kind: transaction.kind,
      installment: transaction.installment,
      ...(transaction.installment
        ? {
            sourceGroupKey: sha256(
              [
                statement.institutionCode,
                transaction.cardLastFour ?? "unmasked",
                transaction.purchaseDate ?? transaction.occurredOn,
                transaction.descriptionRaw
                  .replace(/(?:parcela\s*)?\d{1,3}\s*(?:\/|de)\s*\d{1,3}/i, "")
                  .trim()
                  .toLocaleLowerCase("pt-BR"),
                transaction.installment.total,
              ].join("|"),
            ),
          }
        : {}),
      rawPayload: transaction.rawPayload,
    })),
  };
}
