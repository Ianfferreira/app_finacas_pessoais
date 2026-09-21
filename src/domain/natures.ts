import type { EconomicNature } from "./metrics";

export const ECONOMIC_NATURE_OPTIONS: ReadonlyArray<{
  value: EconomicNature;
  label: string;
}> = [
  { value: "unclassified", label: "Não classificada" },
  { value: "income", label: "Receita" },
  { value: "expense", label: "Gasto" },
  { value: "own_transfer", label: "Transferência própria" },
  { value: "card_payment", label: "Pagamento de fatura" },
  { value: "investment", label: "Investimento" },
  { value: "redemption", label: "Resgate" },
  { value: "refund", label: "Reembolso" },
  { value: "third_party", label: "Terceiro" },
  { value: "loan_given", label: "Empréstimo concedido" },
  { value: "loan_received", label: "Empréstimo recebido" },
  { value: "loan_repayment", label: "Pagamento de empréstimo" },
  { value: "reversal", label: "Estorno" },
  { value: "investment_income", label: "Rendimento de investimento" },
  { value: "adjustment", label: "Ajuste" },
];

export const ECONOMIC_NATURE_VALUES = new Set<EconomicNature>(
  ECONOMIC_NATURE_OPTIONS.map(({ value }) => value),
);

export function economicNatureLabel(nature: EconomicNature): string {
  return (
    ECONOMIC_NATURE_OPTIONS.find(({ value }) => value === nature)?.label ??
    "Não classificada"
  );
}
