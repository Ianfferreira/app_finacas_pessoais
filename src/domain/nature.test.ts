import { describe, expect, it } from "vitest";
import { moneyFromDecimal, moneyToDecimal } from "./money";
import { calculateMonthlyMetrics } from "./metrics";

const self = (amount: string) => [
  { owner: "self" as const, amount: moneyFromDecimal(amount) },
];

describe("economic natures", () => {
  it("does not double count card payment, own transfer, investment, or redemption", () => {
    const metrics = calculateMonthlyMetrics("2026-10-01", [
      {
        id: "expense",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("100.00"),
        nature: "expense",
        allocations: self("100.00"),
      },
      {
        id: "card-payment",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("100.00"),
        nature: "card_payment",
        allocations: self("100.00"),
      },
      {
        id: "transfer",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("50.00"),
        nature: "own_transfer",
        allocations: self("50.00"),
      },
      {
        id: "investment",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("20.00"),
        nature: "investment",
        allocations: self("20.00"),
      },
      {
        id: "redemption",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("20.00"),
        nature: "redemption",
        allocations: self("20.00"),
      },
    ]);
    expect(moneyToDecimal(metrics.personalExpenses)).toBe("100.00");
    expect(moneyToDecimal(metrics.income)).toBe("0.00");
  });
  it("reduces spending with a linked reversal instead of creating income", () => {
    const metrics = calculateMonthlyMetrics("2026-10-01", [
      {
        id: "purchase",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("80.00"),
        nature: "expense",
        allocations: self("80.00"),
      },
      {
        id: "reversal",
        competenceMonth: "2026-10-01",
        amount: moneyFromDecimal("80.00"),
        nature: "reversal",
        allocations: self("80.00"),
      },
    ]);
    expect(moneyToDecimal(metrics.personalExpenses)).toBe("0.00");
    expect(moneyToDecimal(metrics.income)).toBe("0.00");
  });
});
