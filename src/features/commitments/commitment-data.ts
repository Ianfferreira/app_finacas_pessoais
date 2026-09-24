export type CommitmentAllocation = {
  ownerType: "self" | "third_party";
  amount: number;
  personName: string | null;
};

export type CommitmentInput = {
  id: string;
  competenceMonth: string;
  installmentNumber: number;
  amount: number;
  description: string;
  totalInstallments: number;
  cardName: string | null;
  cardLastFour: string | null;
  allocations: readonly CommitmentAllocation[];
};

export type Commitment = CommitmentInput & {
  personalAmount: number;
  thirdPartyAmount: number;
  relatedPeople: string[];
  isFinalInstallment: boolean;
};

export type CommitmentMonth = {
  competenceMonth: string;
  personalAmount: number;
  thirdPartyAmount: number;
  totalAmount: number;
};

export type CommitmentTotals = {
  personalAmount: number;
  thirdPartyAmount: number;
  totalAmount: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function prepareCommitments(
  installments: readonly CommitmentInput[],
): Commitment[] {
  return [...installments]
    .map((installment) => {
      const thirdPartyAmount = installment.allocations
        .filter((allocation) => allocation.ownerType === "third_party")
        .reduce((total, allocation) => total + allocation.amount, 0);
      const personalAmount = installment.allocations.length
        ? installment.allocations
            .filter((allocation) => allocation.ownerType === "self")
            .reduce((total, allocation) => total + allocation.amount, 0)
        : installment.amount;
      return {
        ...installment,
        personalAmount: roundCurrency(personalAmount),
        thirdPartyAmount: roundCurrency(thirdPartyAmount),
        relatedPeople: [
          ...new Set(
            installment.allocations.flatMap((allocation) =>
              allocation.ownerType === "third_party" && allocation.personName
                ? [allocation.personName]
                : [],
            ),
          ),
        ],
        isFinalInstallment:
          installment.installmentNumber === installment.totalInstallments,
      };
    })
    .sort((left, right) =>
      left.competenceMonth.localeCompare(right.competenceMonth),
    );
}

export function summarizeCommitments(
  commitments: readonly Commitment[],
): CommitmentTotals {
  return commitments.reduce(
    (totals, commitment) => ({
      personalAmount: roundCurrency(
        totals.personalAmount + commitment.personalAmount,
      ),
      thirdPartyAmount: roundCurrency(
        totals.thirdPartyAmount + commitment.thirdPartyAmount,
      ),
      totalAmount: roundCurrency(totals.totalAmount + commitment.amount),
    }),
    { personalAmount: 0, thirdPartyAmount: 0, totalAmount: 0 },
  );
}

export function groupCommitmentsByMonth(
  commitments: readonly Commitment[],
): CommitmentMonth[] {
  const totalsByMonth = new Map<string, CommitmentMonth>();
  for (const commitment of commitments) {
    const current = totalsByMonth.get(commitment.competenceMonth) ?? {
      competenceMonth: commitment.competenceMonth,
      personalAmount: 0,
      thirdPartyAmount: 0,
      totalAmount: 0,
    };
    current.personalAmount = roundCurrency(
      current.personalAmount + commitment.personalAmount,
    );
    current.thirdPartyAmount = roundCurrency(
      current.thirdPartyAmount + commitment.thirdPartyAmount,
    );
    current.totalAmount = roundCurrency(
      current.totalAmount + commitment.amount,
    );
    totalsByMonth.set(commitment.competenceMonth, current);
  }
  return [...totalsByMonth.values()].sort((left, right) =>
    left.competenceMonth.localeCompare(right.competenceMonth),
  );
}
