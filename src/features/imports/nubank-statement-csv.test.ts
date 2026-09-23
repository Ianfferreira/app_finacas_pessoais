import { describe, expect, it } from "vitest";
import { sha256 } from "./file-hash";
import { parseNubankStatementCsv } from "./nubank-statement-csv";

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
  it("recognizes both Brazilian and dot-decimal amount layouts", () => {
    const result = parseNubankStatementCsv(
      [
        "Data,Valor,Identificador,Descrição",
        "01/08/2026,2040.00,synthetic-dot,Entrada sintética",
        "02/08/2026,2.040,synthetic-thousands,Saída sintética",
        '03/08/2026,"2.040,00",synthetic-comma,Outro lançamento sintético',
      ].join("\n"),
    );
    expect(result).toEqual({
      success: true,
      rows: [
        expect.objectContaining({ signedAmountCents: 204000n }),
        expect.objectContaining({ signedAmountCents: 204000n }),
        expect.objectContaining({ signedAmountCents: 204000n }),
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
