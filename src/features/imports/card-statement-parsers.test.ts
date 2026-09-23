import { describe, expect, it } from "vitest";

import { moneyToDecimal } from "../../domain/money";
import { parseCaixaCardStatementPdfText } from "./caixa-card-statement-pdf";
import { parseInterCardStatementPdfText } from "./inter-card-statement-pdf";
import { parseNubankCardStatementPdfText } from "./nubank-card-statement-pdf";
import { parseRicoXpCardStatementCsv } from "./rico-xp-card-statement-csv";

describe("card-statement adapters", () => {
  it("parses a Caixa statement with multiple cards, parcelled purchases, and credits", () => {
    const result = parseCaixaCardStatementPdfText(`
      cartões CAIXA
      VENCIMENTO
      04/09/2026
      Synthetic user (Cartão 7282)
      COMPRAS (Cartão 7282)
      13/08 Example market CITY 64,97D
      COMPRAS PARCELADAS (Cartão 7282)
      17/04 Example paint 05 DE 10 CITY 100,00D
      Synthetic user (Cartão 8344)
      COMPRAS (Cartão 8344)
      03/08 OBRIGADO PELO PAGAMENTO CITY 100,00C
      COMPRAS PARCELADAS (Cartão 8344)
      16/08 Example course 01 DE 12 CITY 307,24D
    `);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.statement.institutionCode).toBe("CAIXA");
    expect(result.statement.transactions).toHaveLength(4);
    expect(result.statement.transactions[1]).toMatchObject({
      cardLastFour: "7282",
      competenceMonth: "2026-08-01",
      installment: { number: 5, total: 10 },
    });
    expect(result.statement.transactions[2].kind).toBe("payment");
    expect(result.statement.transactions[3]).toMatchObject({
      cardLastFour: "8344",
      installment: { number: 1, total: 12 },
    });
  });

  it("parses Nubank card purchases, installments, reversal, and a payment without turning payment into expense", () => {
    const result = parseNubankCardStatementPdfText(`
      Data de vencimento: 04 SET 2026
      Período vigente: 28 JUL a 28 AGO
      TRANSAÇÕES DE 28 JUL A 28 AGO
      28 JUL •••• 1234 Example Store - Parcela 2/6 R$ 100,00
      24 AGO Estorno de exemplo −R$ 9,93
      24 AGO Pagamento em 24 AGO −R$ 109,93
    `);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.statement.cycleEnd).toBe("2026-08-28");
    expect(result.statement.transactions.map(({ kind }) => kind)).toEqual([
      "purchase",
      "reversal",
      "payment",
    ]);
    expect(result.statement.transactions[0]).toMatchObject({
      cardLastFour: "1234",
      competenceMonth: "2026-08-01",
      installment: { number: 2, total: 6 },
    });
    expect(moneyToDecimal(result.statement.transactions[0].amount)).toBe(
      "100.00",
    );
  });

  it("parses an Inter zero-due statement with multiple cards, payments, and abbreviated reversals", () => {
    const result = parseInterCardStatementPdfText(`
      Resumo da fatura
      01/09/2026 R$ 0,00
      Despesas da fatura
      CARTÃO 5364****6976
      Data Movimentação Beneficiário Valor
      24 de jul. 2026 Example membership (Parcela 01 de 12) - R$ 44,25
      14 de ago. 2026 Example restaurant - R$ 87,81
      CARTÃO 5555****1142
      24 de jul. 2026 PAGAMENTO ON LINE - + R$ 531,00
      25 de jul. 2026 EST ASS Synthetic subscription - + R$ 10,00
    `);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.statement.dueOn).toBe("2026-09-01");
    expect(result.statement.cycleEnd).toBe("2026-08-14");
    expect(result.statement.parserVersion).toBe("2");
    expect(result.statement.transactions).toHaveLength(4);
    expect(result.statement.transactions[0]).toMatchObject({
      cardLastFour: "6976",
      competenceMonth: "2026-08-01",
      installment: { number: 1, total: 12 },
    });
    expect(result.statement.transactions[2].kind).toBe("payment");
    expect(result.statement.transactions[3].kind).toBe("reversal");
  });

  it("parses the Rico/XP CSV contract and derives the statement competence from its due date", () => {
    const result = parseRicoXpCardStatementCsv(
      [
        "Data;Estabelecimento;Portador;Valor;Parcela",
        "20/07/2026;Example lodging;Synthetic user;R$ 877,13;2 de 6",
        "03/08/2026;Pagamentos Validos Normais;Synthetic user;R$ -877,18;-",
      ].join("\n"),
      "Fatura2026-09-05.csv",
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.statement.transactions[0]).toMatchObject({
      competenceMonth: "2026-08-01",
      installment: { number: 2, total: 6 },
      kind: "purchase",
    });
    expect(result.statement.transactions[1].kind).toBe("payment");
  });

  it("fails explicitly instead of pretending an unknown PDF was parsed", () => {
    expect(
      parseNubankCardStatementPdfText("statement without a known contract"),
    ).toEqual({
      success: false,
      message: "Este PDF não corresponde à fatura Nubank suportada.",
    });
  });
});
