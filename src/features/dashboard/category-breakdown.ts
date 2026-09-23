export type CategoryMetric = {
  category_name: string;
  personal_expenses: number;
};

export type CategoryReference = {
  id: string;
  name: string;
};

export type CategoryBreakdownItem = CategoryMetric & {
  category_id: string | null;
  percentage_of_categorized: number | null;
};

export type CategoryBreakdown = {
  categorized: CategoryBreakdownItem[];
  uncategorized: CategoryMetric | null;
  categorized_total: number;
};

/**
 * Converts the aggregate returned by Postgres into presentation data without
 * inventing a category for rows that still need review. Percentages are only
 * meaningful against the categorized personal-expense total.
 */
export function buildCategoryBreakdown(
  metrics: readonly CategoryMetric[],
  categories: readonly CategoryReference[],
): CategoryBreakdown {
  const categoryIdByName = new Map(
    categories.map((category) => [category.name, category.id]),
  );
  const categorizedMetrics = metrics.filter((metric) =>
    categoryIdByName.has(metric.category_name),
  );
  const categorizedTotal = categorizedMetrics.reduce(
    (total, metric) => total + metric.personal_expenses,
    0,
  );

  return {
    categorized: categorizedMetrics.map((metric) => ({
      ...metric,
      category_id: categoryIdByName.get(metric.category_name) ?? null,
      percentage_of_categorized:
        categorizedTotal > 0
          ? (metric.personal_expenses / categorizedTotal) * 100
          : null,
    })),
    uncategorized:
      metrics.find((metric) => !categoryIdByName.has(metric.category_name)) ??
      null,
    categorized_total: categorizedTotal,
  };
}

export function movementsDrilldownHref(
  month: string,
  categoryId?: string | null,
): string {
  const params = new URLSearchParams({ month: month.slice(0, 7) });
  if (categoryId) params.set("category", categoryId);
  return `/movements?${params.toString()}`;
}
