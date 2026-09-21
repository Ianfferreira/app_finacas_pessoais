import { sumMoney, type Money } from "./money";

export type AllocationOwner = "self" | "third_party";

export type Allocation = {
  owner: AllocationOwner;
  amount: Money;
};

export type PercentageAllocation = {
  owner: AllocationOwner;
  basisPoints: bigint;
};

const PERCENTAGE_TOTAL_BASIS_POINTS = 10_000n;

export function assertAllocationTotal(
  transactionAmount: Money,
  allocations: readonly Allocation[],
): void {
  if (transactionAmount < 0n || allocations.some(({ amount }) => amount < 0n)) {
    throw new Error("Valores de rateio não podem ser negativos.");
  }

  if (sumMoney(allocations.map(({ amount }) => amount)) !== transactionAmount) {
    throw new Error("A soma dos rateios deve ser igual ao valor da transação.");
  }
}

/**
 * Distributes residual cents in declaration order, making the result explicit
 * and deterministic. UI adapters may convert decimal percentages to basis
 * points before entering the pure domain.
 */
export function allocateByBasisPoints(
  transactionAmount: Money,
  shares: readonly PercentageAllocation[],
): Allocation[] {
  if (transactionAmount < 0n || shares.length === 0) {
    throw new Error("Informe um valor não negativo e pelo menos um rateio.");
  }

  if (
    shares.some(({ basisPoints }) => basisPoints < 0n) ||
    sumMoney(shares.map(({ basisPoints }) => basisPoints)) !==
      PERCENTAGE_TOTAL_BASIS_POINTS
  ) {
    throw new Error("Os percentuais devem somar exatamente 100,00%.");
  }

  let assigned = 0n;
  const allocations = shares.map(({ owner, basisPoints }) => {
    const amount =
      (transactionAmount * basisPoints) / PERCENTAGE_TOTAL_BASIS_POINTS;
    assigned += amount;
    return { owner, amount };
  });

  let residual = transactionAmount - assigned;
  for (let index = 0; residual > 0n; index = (index + 1) % allocations.length) {
    allocations[index] = {
      ...allocations[index],
      amount: allocations[index].amount + 1n,
    };
    residual -= 1n;
  }

  assertAllocationTotal(transactionAmount, allocations);
  return allocations;
}
