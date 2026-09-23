import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  createStructuredExportZip,
  transactionsToCsv,
} from "./financial-export";

describe("structured financial export", () => {
  it("escapes CSV fields and keeps the private evidence boundary outside the ZIP", () => {
    const csv = transactionsToCsv([
      {
        id: "synthetic-id",
        description_raw: 'Synthetic "market", order',
        amount: 10.5,
      },
    ]);
    expect(csv).toContain('"Synthetic ""market"", order"');

    const archive = unzipSync(
      createStructuredExportZip(
        { transactions: [{ id: "synthetic-id" }] },
        csv,
      ),
    );
    expect(Object.keys(archive).sort()).toEqual([
      "LEIA-ME.txt",
      "financas-export.json",
      "financas-movimentacoes.csv",
    ]);
    expect(strFromU8(archive["financas-export.json"])).toContain(
      '"synthetic-id"',
    );
    expect(strFromU8(archive["LEIA-ME.txt"])).toContain("não foram incluídos");
  });
});
