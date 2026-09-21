import { assertAllocationTotal, type Allocation } from "./allocations";
import { sumMoney, type Money } from "./money";

export type EconomicNature =
  | "income"
  | "expense"
  | "own_transfer"
  | "card_payment"
  | "investment"
  | "redemption"
  | "refund"
  | "third_party"
  | "loan_given"
  | "loan_received"
  | "loan_repayment"
  | "reversal"
  | "investment_income"
  | "adjustment"
  | "unclassified";

export type MetricTransaction = {
  id: string;
  competenceMonth: string;
  amount: Money;
  nature: EconomicNature;
  categoryId?: string;
  allocations: readonly Allocation[];
  isVoid?: boolean;
};

export type MonthlyMetrics = {
  income: Money;
  personalExpenses: Money;
  result: bigint;
  incomeConsumedBasisPoints: bigint | null;
  categorizedPersonalExpenses: Money;
  uncategorizedPersonalExpenses: Money;
  categoryExpenses: ReadonlyMap<string, Money>;
};

function signedPersonalExpense(transaction: MetricTransaction): bigint {
  const ownAmount = sumMoney(
    transaction.allocations
      .filter(({ owner }) => owner === "self")
      .map(({ amount }) => amount),
  );

  if (transaction.nature === "expense") return ownAmount;
  if (transaction.nature === "reversal") return -ownAmount;
  return 0n;
}

export function calculateMonthlyMetrics(
  competenceMonth: string,
  transactions: readonly MetricTransaction[],
): MonthlyMetrics {
  let income = 0n;
  let personalExpenses = 0n;
  let categorizedPersonalExpenses = 0n;
  const categoryExpenses = new Map<string, Money>();

  for (const transaction of transactions) {
    if (transaction.competenceMonth !== competenceMonth || transaction.isVoid) {
      continue;
    }

    assertAllocationTotal(transaction.amount, transaction.allocations);

    if (
      transaction.nature === "income" ||
      transaction.nature === "investment_income"
    ) {
      income += transaction.amount;
    }

    const personalImpact = signedPersonalExpense(transaction);
    personalExpenses += personalImpact;

    if (transaction.categoryId) {
      categorizedPersonalExpenses += personalImpact;
      categoryExpenses.set(
        transaction.categoryId,
        (categoryExpenses.get(transaction.categoryId) ?? 0n) + personalImpact,
      );
    }
  }

  return {
    income,
    personalExpenses,
    result: income - personalExpenses,
    incomeConsumedBasisPoints:
      income > 0n ? (personalExpenses * 10_000n) / income : null,
    categorizedPersonalExpenses,
    uncategorizedPersonalExpenses:
      personalExpenses - categorizedPersonalExpenses,
    categoryExpenses,
  };
}
