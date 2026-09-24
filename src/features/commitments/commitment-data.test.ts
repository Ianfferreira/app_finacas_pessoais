import { describe, expect, it } from "vitest";

import {
  groupCommitmentsByMonth,
  prepareCommitments,
  summarizeCommitments,
} from "./commitment-data";

describe("commitment presentation data", () => {
  it("consolidates scheduled installments by competence and separates personal and third-party amounts", () => {
    const commitments = prepareCommitments([
      {
        id: "one",
        competenceMonth: "2026-10-01",
        installmentNumber: 2,
        amount: 100,
        description: "Compra sintética",
        totalInstallments: 3,
        cardName: "Cartão teste",
        cardLastFour: "1234",
        allocations: [
          { ownerType: "self", amount: 60, personName: null },
          { ownerType: "third_party", amount: 40, personName: "Pessoa A" },
        ],
      },
      {
        id: "two",
        competenceMonth: "2026-10-01",
        installmentNumber: 1,
        amount: 50,
        description: "Outra compra sintética",
        totalInstallments: 2,
        cardName: null,
        cardLastFour: null,
        allocations: [],
      },
    ]);

    expect(summarizeCommitments(commitments)).toEqual({
      personalAmount: 110,
      thirdPartyAmount: 40,
      totalAmount: 150,
    });
    expect(groupCommitmentsByMonth(commitments)).toEqual([
      {
        competenceMonth: "2026-10-01",
        personalAmount: 110,
        thirdPartyAmount: 40,
        totalAmount: 150,
      },
    ]);
  });

  it("treats an installment with no future allocation as personal", () => {
    const [commitment] = prepareCommitments([
      {
        id: "no-allocation",
        competenceMonth: "2026-11-01",
        installmentNumber: 1,
        amount: 75,
        description: "Compra sintética",
        totalInstallments: 2,
        cardName: null,
        cardLastFour: null,
        allocations: [],
      },
    ]);

    expect(commitment.personalAmount).toBe(75);
    expect(commitment.thirdPartyAmount).toBe(0);
  });

  it("keeps every related person and marks the last installment as the end of the commitment", () => {
    const [commitment] = prepareCommitments([
      {
        id: "last",
        competenceMonth: "2026-12-01",
        installmentNumber: 3,
        amount: 90,
        description: "Compra sintética",
        totalInstallments: 3,
        cardName: null,
        cardLastFour: null,
        allocations: [
          { ownerType: "self", amount: 30, personName: null },
          { ownerType: "third_party", amount: 30, personName: "Pessoa A" },
          { ownerType: "third_party", amount: 30, personName: "Pessoa B" },
        ],
      },
    ]);

    expect(commitment.relatedPeople).toEqual(["Pessoa A", "Pessoa B"]);
    expect(commitment.isFinalInstallment).toBe(true);
    expect(summarizeCommitments([commitment])).not.toHaveProperty("income");
  });
});
