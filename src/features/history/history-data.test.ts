import { describe, expect, it } from "vitest";

import {
  buildCategoryEvolution,
  buildHistoryRows,
  filterHistoryPeriods,
  requiresQualityAlert,
  type HistoryPeriod,
} from "./history-data";

const periods: HistoryPeriod[] = [
  {
    competenceMonth: "2026-01-01",
    income: 1000,
    personalExpenses: 400,
    closingStatus: "closed",
  },
  {
    competenceMonth: "2026-02-01",
    income: 1000,
    personalExpenses: 600,
    closingStatus: "closed_with_pending",
  },
  {
    competenceMonth: "2026-03-01",
    income: 0,
    personalExpenses: 150,
    closingStatus: "in_progress",
  },
  {
    competenceMonth: "2027-01-01",
    income: 2000,
    personalExpenses: 500,
    closingStatus: "closed",
  },
];

describe("history presentation data", () => {
  it("filters the available history by 3M, 6M, 12M, year and all", () => {
    expect(filterHistoryPeriods(periods, "3m")).toHaveLength(3);
    expect(filterHistoryPeriods(periods, "6m")).toHaveLength(4);
    expect(filterHistoryPeriods(periods, "12m")).toHaveLength(4);
    expect(filterHistoryPeriods(periods, "year", "2026")).toHaveLength(3);
    expect(filterHistoryPeriods(periods, "all")).toHaveLength(4);
  });

  it("calculates result, consumed income and comparisons only with a valid base", () => {
    const rows = buildHistoryRows(periods, "all");

    expect(rows[0]).toMatchObject({
      result: 600,
      incomeConsumedPercent: 40,
      differenceFromPrevious: null,
      variationFromPreviousPercent: null,
    });
    expect(rows[1]).toMatchObject({
      result: 400,
      incomeConsumedPercent: 60,
      differenceFromPrevious: -200,
      variationFromPreviousPercent: -33.33,
      closingStatus: "closed_with_pending",
    });
    expect(requiresQualityAlert(rows[1].closingStatus)).toBe(true);
    expect(rows[2]).toMatchObject({
      result: -150,
      incomeConsumedPercent: null,
      differenceFromPrevious: -550,
      variationFromPreviousPercent: -137.5,
    });
  });

  it("marks percentage comparison as unavailable when the preceding result is zero", () => {
    const rows = buildHistoryRows(
      [{ ...periods[0], income: 400, personalExpenses: 400 }, periods[1]],
      "all",
    );

    expect(rows[1].differenceFromPrevious).toBe(400);
    expect(rows[1].variationFromPreviousPercent).toBeNull();
  });

  it("uses only self allocations and makes reversals reduce category spending", () => {
    const evolution = buildCategoryEvolution(
      "food",
      [
        {
          competenceMonth: "2026-01-01",
          nature: "expense",
          categoryId: "food",
          isVoid: false,
          allocations: [
            { ownerType: "self", amount: 30 },
            { ownerType: "third_party", amount: 20 },
          ],
        },
        {
          competenceMonth: "2026-02-01",
          nature: "reversal",
          categoryId: "food",
          isVoid: false,
          allocations: [{ ownerType: "self", amount: 8 }],
        },
        {
          competenceMonth: "2026-02-01",
          nature: "expense",
          categoryId: "other",
          isVoid: false,
          allocations: [{ ownerType: "self", amount: 99 }],
        },
      ],
      periods,
    );

    expect(evolution.map((point) => point.personalExpenses)).toEqual([
      30, -8, 0, 0,
    ]);
  });
});
