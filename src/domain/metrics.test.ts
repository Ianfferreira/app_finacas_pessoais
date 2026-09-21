import { describe, expect, it } from "vitest";

import { allocateByBasisPoints, assertAllocationTotal } from "./allocations";
import { syntheticAugustFixture } from "./financial-fixtures";
import { moneyFromDecimal, moneyToDecimal } from "./money";
import { calculateMonthlyMetrics } from "./metrics";

describe("money and allocations", () => {
  it("never uses floating point and preserves a 50/50 residual cent", () => {
    const allocations = allocateByBasisPoints(moneyFromDecimal("100.01"), [
      { owner: "self", basisPoints: 5_000n },
      { owner: "third_party", basisPoints: 5_000n },
    ]);

    expect(allocations.map(({ amount }) => moneyToDecimal(amount))).toEqual([
      "50.01",
      "50.00",
    ]);
  });

  it("rejects allocation totals that do not conserve the transaction value", () => {
    expect(() =>
      assertAllocationTotal(moneyFromDecimal("10.00"), [
        { owner: "self", amount: moneyFromDecimal("9.99") },
      ]),
    ).toThrow(/soma dos rateios/);
  });
});

describe("monthly economic metrics", () => {
  it("counts income and personal spending, preserving third-party share", () => {
    const metrics = calculateMonthlyMetrics(
      "2026-08-01",
      syntheticAugustFixture,
    );

    expect(moneyToDecimal(metrics.income)).toBe("5000.00");
    expect(moneyToDecimal(metrics.personalExpenses)).toBe("1230.01");
    expect(moneyToDecimal(metrics.result)).toBe("3769.99");
    expect(metrics.incomeConsumedBasisPoints).toBe(2460n);
    expect(moneyToDecimal(metrics.categoryExpenses.get("food") ?? 0n)).toBe(
      "30.01",
    );
  });

  it("does not treat a card payment, investment, redemption, or own transfer as income or expense", () => {
    const metrics = calculateMonthlyMetrics(
      "2026-08-01",
      syntheticAugustFixture,
    );

    expect(moneyToDecimal(metrics.personalExpenses)).toBe("1230.01");
    expect(moneyToDecimal(metrics.income)).toBe("5000.00");
  });

  it("returns no income-consumed percentage without positive income", () => {
    const metrics = calculateMonthlyMetrics("2026-09-01", [
      {
        id: "no-income",
        competenceMonth: "2026-09-01",
        amount: moneyFromDecimal("10.00"),
        nature: "expense",
        allocations: [{ owner: "self", amount: moneyFromDecimal("10.00") }],
      },
    ]);

    expect(metrics.incomeConsumedBasisPoints).toBeNull();
  });
});
