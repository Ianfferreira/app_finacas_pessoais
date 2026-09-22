import { describe, expect, it } from "vitest";

import { chooseClassification, isManuallyLocked } from "./classification";

describe("classification precedence", () => {
  it("implements the mandatory product precedence", () => {
    expect(
      chooseClassification([
        { source: "heuristic", value: "heuristic" },
        { source: "parser", value: "parser" },
        { source: "merchant_mapping", value: "merchant" },
        { source: "user_rule", value: "rule", priority: 20 },
        { source: "manual", value: "manual" },
      ]),
    ).toMatchObject({ source: "manual", value: "manual" });
  });

  it("uses explicit user rule priority rather than insertion order", () => {
    expect(
      chooseClassification([
        { source: "user_rule", value: "later", priority: 30 },
        { source: "user_rule", value: "first", priority: 10 },
      ]),
    ).toMatchObject({ value: "first" });
  });

  it("treats manual locks as an independent field-level protection", () => {
    expect(isManuallyLocked({ category: true }, "category")).toBe(true);
    expect(isManuallyLocked({ category: true }, "nature")).toBe(false);
  });
});
