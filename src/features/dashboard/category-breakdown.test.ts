import { describe, expect, it } from "vitest";

import {
  buildCategoryBreakdown,
  movementsDrilldownHref,
} from "./category-breakdown";

describe("buildCategoryBreakdown", () => {
  it("keeps uncategorized spending separate from the categorized denominator", () => {
    const breakdown = buildCategoryBreakdown(
      [
        { category_name: "Alimentação", personal_expenses: 30 },
        { category_name: "Transporte", personal_expenses: 10 },
        { category_name: "Sem categoria", personal_expenses: 5 },
      ],
      [
        { id: "food", name: "Alimentação" },
        { id: "transport", name: "Transporte" },
      ],
    );

    expect(breakdown.categorized_total).toBe(40);
    expect(breakdown.categorized).toEqual([
      expect.objectContaining({
        category_id: "food",
        percentage_of_categorized: 75,
      }),
      expect.objectContaining({
        category_id: "transport",
        percentage_of_categorized: 25,
      }),
    ]);
    expect(breakdown.uncategorized).toEqual({
      category_name: "Sem categoria",
      personal_expenses: 5,
    });
  });

  it("does not create a percentage when categorized spending has no positive base", () => {
    const breakdown = buildCategoryBreakdown(
      [{ category_name: "Alimentação", personal_expenses: 0 }],
      [{ id: "food", name: "Alimentação" }],
    );

    expect(breakdown.categorized[0]?.percentage_of_categorized).toBeNull();
  });
});

describe("movementsDrilldownHref", () => {
  it("keeps the competence and exact category filter", () => {
    expect(movementsDrilldownHref("2026-09-01", "food")).toBe(
      "/movements?month=2026-09&category=food",
    );
  });
});
