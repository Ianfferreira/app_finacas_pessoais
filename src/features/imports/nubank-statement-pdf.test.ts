import { describe, expect, it } from "vitest";

import {
  nubankPdfRowToRpc,
  parseNubankStatementPdfText,
} from "./nubank-statement-pdf";

describe("parseNubankStatementPdfText", () => {
  it("keeps the bank statement direction from its explicit section", () => {
    const result = parseNubankStatementPdfText(`
      Nubank\nExtrato\nPeríodo 01 ago. 2026 a 31 ago. 2026
      Entradas
      02 ago. Transferência recebida R$ 1.000,00
      Saídas
      03 ago. Mercado sintético R$ 12,34
    `);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rows).toHaveLength(2);
    expect(nubankPdfRowToRpc(result.rows[0]).signedAmount).toBe("1000.00");
    expect(nubankPdfRowToRpc(result.rows[1]).signedAmount).toBe("-12.34");
  });

  it("does not claim unknown PDFs", () => {
    expect(parseNubankStatementPdfText("Relatório de despesas").success).toBe(
      false,
    );
  });
});
