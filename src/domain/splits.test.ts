import { describe, expect, it } from "vitest";

import { assertExactSplit, balancesByPerson } from "./splits";

describe("third-party splits", () => {
  it("conserves cents exactly", () => {
    expect(() =>
      assertExactSplit(100n, [
        { personId: null, amount: 67n },
        { personId: "person", amount: 33n },
      ]),
    ).not.toThrow();
    expect(() =>
      assertExactSplit(100n, [
        { personId: null, amount: 67n },
        { personId: "person", amount: 32n },
      ]),
    ).toThrow(/centavos/);
  });

  it("keeps receivables and credits in one signed balance", () => {
    expect(
      balancesByPerson([
        { personId: "person", amount: 1000n },
        { personId: "person", amount: -300n },
      ]),
    ).toEqual({ person: 700n });
  });

  it("does not allow the same third party twice in a split", () => {
    expect(() =>
      assertExactSplit(100n, [
        { personId: "person", amount: 50n },
        { personId: "person", amount: 50n },
      ]),
    ).toThrow(/apenas uma vez/);
  });
});
