import type { Money } from "./money";

export type InstallmentScheduleItem = {
  installmentNumber: number;
  competenceMonth: string;
  amount: Money;
  status: "realized" | "scheduled";
};

function firstDayOfMonth(value: string): Date {
  if (!/^\d{4}-\d{2}-01$/.test(value)) {
    throw new Error(
      "A competência deve ser o primeiro dia do mês (AAAA-MM-01).",
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) {
    throw new Error("A competência informada é inválida.");
  }

  return date;
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Materializes the known remaining installments from the billing cycle that
 * contains the current installment. Earlier installments are intentionally
 * absent when their statements were not imported.
 */
export function buildInstallmentSchedule(input: {
  currentInstallment: number;
  totalInstallments: number;
  currentCompetenceMonth: string;
  amount: Money;
}): InstallmentScheduleItem[] {
  const {
    currentInstallment,
    totalInstallments,
    currentCompetenceMonth,
    amount,
  } = input;

  if (
    !Number.isInteger(currentInstallment) ||
    !Number.isInteger(totalInstallments) ||
    currentInstallment < 1 ||
    totalInstallments < currentInstallment
  ) {
    throw new Error(
      "A parcela atual deve estar entre 1 e o total de parcelas.",
    );
  }
  if (amount < 0n) {
    throw new Error("O valor da parcela não pode ser negativo.");
  }

  const start = firstDayOfMonth(currentCompetenceMonth);
  return Array.from(
    { length: totalInstallments - currentInstallment + 1 },
    (_, offset) => {
      const date = new Date(start);
      date.setUTCMonth(date.getUTCMonth() + offset);
      return {
        installmentNumber: currentInstallment + offset,
        competenceMonth: formatMonth(date),
        amount,
        status: offset === 0 ? "realized" : "scheduled",
      };
    },
  );
}
