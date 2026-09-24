export type HistoryRange = "3m" | "6m" | "12m" | "year" | "all";

export type ClosingStatus = "in_progress" | "closed" | "closed_with_pending";

export type HistoryPeriod = {
  competenceMonth: string;
  income: number;
  personalExpenses: number;
  closingStatus: ClosingStatus;
};

export type HistoryRow = HistoryPeriod & {
  result: number;
  incomeConsumedPercent: number | null;
  differenceFromPrevious: number | null;
  variationFromPreviousPercent: number | null;
};

export type CategoryTransaction = {
  competenceMonth: string;
  nature: "expense" | "reversal" | string;
  categoryId: string | null;
  isVoid: boolean;
  allocations: ReadonlyArray<{
    ownerType: "self" | "third_party";
    amount: number;
  }>;
};

export type CategoryEvolutionPoint = {
  competenceMonth: string;
  personalExpenses: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function byCompetenceMonth(
  left: { competenceMonth: string },
  right: { competenceMonth: string },
) {
  return left.competenceMonth.localeCompare(right.competenceMonth);
}

export function filterHistoryPeriods(
  periods: readonly HistoryPeriod[],
  range: HistoryRange,
  year?: string,
): HistoryPeriod[] {
  const ordered = [...periods].sort(byCompetenceMonth);
  if (range === "all") return ordered;
  if (range === "year") {
    const targetYear = year ?? ordered.at(-1)?.competenceMonth.slice(0, 4);
    return ordered.filter(
      (period) => period.competenceMonth.slice(0, 4) === targetYear,
    );
  }
  const amount = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  return ordered.slice(-amount);
}

export function buildHistoryRows(
  periods: readonly HistoryPeriod[],
  range: HistoryRange,
  year?: string,
): HistoryRow[] {
  const ordered = [...periods].sort(byCompetenceMonth);
  const allRows = ordered.map((period, index) => {
    const previous = ordered[index - 1];
    const result = roundCurrency(period.income - period.personalExpenses);
    const previousResult = previous
      ? roundCurrency(previous.income - previous.personalExpenses)
      : null;
    const differenceFromPrevious =
      previousResult === null ? null : roundCurrency(result - previousResult);
    return {
      ...period,
      result,
      incomeConsumedPercent:
        period.income > 0
          ? roundCurrency((period.personalExpenses / period.income) * 100)
          : null,
      differenceFromPrevious,
      variationFromPreviousPercent:
        previousResult === null ||
        previousResult === 0 ||
        differenceFromPrevious === null
          ? null
          : roundCurrency(
              (differenceFromPrevious / Math.abs(previousResult)) * 100,
            ),
    };
  });
  const selectedMonths = new Set(
    filterHistoryPeriods(ordered, range, year).map(
      (period) => period.competenceMonth,
    ),
  );
  return allRows.filter((row) => selectedMonths.has(row.competenceMonth));
}

/**
 * Category history counts only the allocation explicitly assigned to the
 * account owner. Reversals retain their economic sign and reduce spending.
 */
export function buildCategoryEvolution(
  categoryId: string,
  transactions: readonly CategoryTransaction[],
  periods: readonly Pick<HistoryPeriod, "competenceMonth">[],
): CategoryEvolutionPoint[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (
      transaction.isVoid ||
      transaction.categoryId !== categoryId ||
      (transaction.nature !== "expense" && transaction.nature !== "reversal")
    ) {
      continue;
    }
    const selfAmount = transaction.allocations
      .filter((allocation) => allocation.ownerType === "self")
      .reduce((total, allocation) => total + allocation.amount, 0);
    const signedAmount =
      transaction.nature === "reversal" ? -selfAmount : selfAmount;
    totals.set(
      transaction.competenceMonth,
      roundCurrency(
        (totals.get(transaction.competenceMonth) ?? 0) + signedAmount,
      ),
    );
  }

  return [...periods].sort(byCompetenceMonth).map((period) => ({
    competenceMonth: period.competenceMonth,
    personalExpenses: totals.get(period.competenceMonth) ?? 0,
  }));
}

export function closingStatusLabel(status: ClosingStatus) {
  if (status === "closed") return "Fechado";
  if (status === "closed_with_pending") return "Fechado com pendências";
  return "Em andamento";
}

export function requiresQualityAlert(status: ClosingStatus) {
  return status === "closed_with_pending";
}
