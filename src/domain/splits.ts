import type { Money } from "./money";
import { sumMoney } from "./money";

export type ExactSplit = { personId: string | null; amount: Money };

/** Validates values already apportioned in cents; it never rounds floats. */
export function assertExactSplit(
  total: Money,
  splits: readonly ExactSplit[],
): void {
  if (
    total < 0n ||
    !splits.length ||
    splits.some((split) => split.amount < 0n)
  ) {
    throw new Error("Rateio inválido.");
  }
  if (sumMoney(splits.map((split) => split.amount)) !== total) {
    throw new Error("O rateio deve conservar exatamente todos os centavos.");
  }
  if (splits.filter((split) => split.personId === null).length > 1) {
    throw new Error("O rateio pode ter apenas uma parcela pessoal.");
  }
  const people = splits
    .map((split) => split.personId)
    .filter((personId): personId is string => personId !== null);
  if (new Set(people).size !== people.length) {
    throw new Error("Uma pessoa pode aparecer apenas uma vez no rateio.");
  }
}

export type ThirdPartyLedgerEntry = { personId: string; amount: Money };

/** Positive is owed to the user; negative is credit/payable for that person. */
export function balancesByPerson(entries: readonly ThirdPartyLedgerEntry[]) {
  return entries.reduce<Record<string, Money>>((balances, entry) => {
    balances[entry.personId] = (balances[entry.personId] ?? 0n) + entry.amount;
    return balances;
  }, {});
}
