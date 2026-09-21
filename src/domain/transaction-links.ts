export const TRANSACTION_LINK_TYPE_OPTIONS = [
  { value: "reversal_of", label: "Estorno de" },
  { value: "pays_statement", label: "Pagamento de fatura" },
  { value: "own_transfer_pair", label: "Par de transferência própria" },
  { value: "settles_third_party", label: "Liquidação com terceiro" },
  { value: "duplicate_of", label: "Possível duplicidade de" },
  { value: "related", label: "Relacionada a" },
] as const;

export type TransactionLinkType =
  (typeof TRANSACTION_LINK_TYPE_OPTIONS)[number]["value"];

export const TRANSACTION_LINK_TYPES = new Set<TransactionLinkType>(
  TRANSACTION_LINK_TYPE_OPTIONS.map(({ value }) => value),
);
