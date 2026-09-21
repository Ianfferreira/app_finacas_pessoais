import { describe, expect, it } from "vitest";
import { parseNubankStatementCsv, sha256 } from "./nubank-statement-csv";

describe("Nubank statement CSV parser", () => {
  it("parses the documented header and quoted descriptions without float arithmetic", () => {
    const result = parseNubankStatementCsv(
      'Data,Valor,Identificador,Descrição\n01/08/2026,-12,abc-1,"Mercado, bairro"\n02/08/2026,"150,50",abc-2,Recebimento',
    );
    expect(result).toEqual({
      success: true,
      rows: [
        {
          occurredOn: "2026-08-01",
          signedAmountCents: -1200n,
          externalId: "abc-1",
          descriptionRaw: "Mercado, bairro",
        },
        {
          occurredOn: "2026-08-02",
          signedAmountCents: 15050n,
          externalId: "abc-2",
          descriptionRaw: "Recebimento",
        },
      ],
    });
  });
  it("rejects unknown files and produces a deterministic file hash", () => {
    expect(parseNubankStatementCsv("date,amount")).toEqual({
      success: false,
      message: "O arquivo não é um extrato CSV Nubank reconhecido.",
    });
    expect(sha256("synthetic file")).toBe(sha256("synthetic file"));
  });
});
