import { describe, expect, it } from "vitest";

import { moneyFromDecimal } from "../../domain/money";
import { cardStatementRpcPayload } from "./card-statement-payload";
import type { ParsedCardStatement } from "./card-statement";

describe("cardStatementRpcPayload", () => {
  it("keeps money exact and makes a stable installment identity", () => {
    const source: ParsedCardStatement = {
      institutionCode: "CAIXA",
      parserName: "synthetic",
      parserVersion: "1",
      cycleStart: null,
      cycleEnd: "2026-08-31",
      dueOn: "2026-09-10",
      transactions: [
        {
          sourceRowNumber: 4,
          cardLastFour: "1234",
          occurredOn: "2026-08-20",
          purchaseDate: "2026-08-20",
          competenceMonth: "2026-08-01",
          descriptionRaw: "Notebook 2 de 10",
          amount: moneyFromDecimal("99.99"),
          kind: "purchase",
          installment: { number: 2, total: 10 },
          rawPayload: {},
        },
      ],
    };

    const first = cardStatementRpcPayload(source);
    const second = cardStatementRpcPayload(source);
    expect(first.cardLastFours).toEqual(["1234"]);
    expect(first.rows[0].amount).toBe("99.99");
    expect(first.rows[0].sourceGroupKey).toMatch(/^[a-f0-9]{64}$/);
    expect(first.rows[0].sourceGroupKey).toBe(second.rows[0].sourceGroupKey);
  });
});
