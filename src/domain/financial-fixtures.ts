import { allocateByBasisPoints } from "./allocations";
import { moneyFromDecimal } from "./money";
import type { MetricTransaction } from "./metrics";

const SELF_ONLY = [{ owner: "self" as const, basisPoints: 10_000n }];

/** Synthetic August-like regression data; never based on personal records. */
export const syntheticAugustFixture: readonly MetricTransaction[] = [
  {
    id: "synthetic-income",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("5000.00"),
    nature: "income",
    allocations: allocateByBasisPoints(moneyFromDecimal("5000.00"), SELF_ONLY),
  },
  {
    id: "synthetic-personal-expense",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("1200.00"),
    nature: "expense",
    categoryId: "housing",
    allocations: allocateByBasisPoints(moneyFromDecimal("1200.00"), SELF_ONLY),
  },
  {
    id: "synthetic-shared-expense",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("100.01"),
    nature: "expense",
    categoryId: "food",
    allocations: allocateByBasisPoints(moneyFromDecimal("100.01"), [
      { owner: "self", basisPoints: 5_000n },
      { owner: "third_party", basisPoints: 5_000n },
    ]),
  },
  {
    id: "synthetic-reversal",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("20.00"),
    nature: "reversal",
    categoryId: "food",
    allocations: allocateByBasisPoints(moneyFromDecimal("20.00"), SELF_ONLY),
  },
  {
    id: "synthetic-card-payment",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("1280.01"),
    nature: "card_payment",
    allocations: allocateByBasisPoints(moneyFromDecimal("1280.01"), SELF_ONLY),
  },
  {
    id: "synthetic-investment",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("500.00"),
    nature: "investment",
    allocations: allocateByBasisPoints(moneyFromDecimal("500.00"), SELF_ONLY),
  },
  {
    id: "synthetic-redemption",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("500.00"),
    nature: "redemption",
    allocations: allocateByBasisPoints(moneyFromDecimal("500.00"), SELF_ONLY),
  },
  {
    id: "synthetic-own-transfer",
    competenceMonth: "2026-08-01",
    amount: moneyFromDecimal("350.00"),
    nature: "own_transfer",
    allocations: allocateByBasisPoints(moneyFromDecimal("350.00"), SELF_ONLY),
  },
];
