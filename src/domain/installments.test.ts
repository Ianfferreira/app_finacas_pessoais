import { describe, expect, it } from "vitest";

import { buildInstallmentSchedule } from "./installments";
import { moneyFromDecimal, moneyToDecimal } from "./money";

describe("buildInstallmentSchedule", () => {
  it("keeps the current installment in its billing-cycle competence and creates only known future commitments", () => {
    const schedule = buildInstallmentSchedule({
      currentInstallment: 2,
      totalInstallments: 4,
      currentCompetenceMonth: "2026-08-01",
      amount: moneyFromDecimal("123.45"),
    });

    expect(
      schedule.map(({ installmentNumber, competenceMonth, status }) => ({
        installmentNumber,
        competenceMonth,
        status,
      })),
    ).toEqual([
      {
        installmentNumber: 2,
        competenceMonth: "2026-08-01",
        status: "realized",
      },
      {
        installmentNumber: 3,
        competenceMonth: "2026-09-01",
        status: "scheduled",
      },
      {
        installmentNumber: 4,
        competenceMonth: "2026-10-01",
        status: "scheduled",
      },
    ]);
    expect(schedule.map(({ amount }) => moneyToDecimal(amount))).toEqual([
      "123.45",
      "123.45",
      "123.45",
    ]);
  });

  it("rejects an impossible installment position", () => {
    expect(() =>
      buildInstallmentSchedule({
        currentInstallment: 5,
        totalInstallments: 4,
        currentCompetenceMonth: "2026-08-01",
        amount: moneyFromDecimal("1.00"),
      }),
    ).toThrow("A parcela atual deve estar entre 1 e o total de parcelas.");
  });
});
